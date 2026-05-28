const { prisma } = require('../config/db');
const { recordReportResolution } = require('./trustService');

// Decay coefficient for reports (half-life of ~14 hours over 48h active window)
const LAMBDA = 0.05;
// Rapid decay coefficient for volatile queue logs (half-life of ~1.4 hours over 4h window)
const LAMBDA_QUEUE = 0.5;
// Data density scaling factor
const GAMMA = 0.4;

/**
 * Calculates consensus and updates charging station status, confidence, and queue estimate.
 * Runs whenever a new report is added or manually triggered.
 * 
 * @param {string} stationId - ID of the charging station
 * @returns {Promise<object>} The updated ChargingStation object
 */
const runConsensusEngine = async (stationId) => {
  const now = new Date();
  const activeWindowLimit = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48-hour consensus window

  // 1. Fetch station and all active reports (with user trust score)
  const station = await prisma.chargingStation.findUnique({
    where: { id: stationId }
  });

  if (!station) {
    throw new Error('Charging station not found');
  }

  const reports = await prisma.report.findMany({
    where: {
      station_id: stationId,
      created_at: { gte: activeWindowLimit },
      user: {
        account_status: { not: 'SUSPENDED' } // Ignore reports from suspended users
      }
    },
    include: {
      user: true
    }
  });

  let wWorking = 0;
  let wBroken = 0;
  let activeReportsCount = reports.length;

  // 2. Compute weighted status voting
  reports.forEach((report) => {
    const elapsedHours = (now - new Date(report.created_at)) / (1000 * 60 * 60);
    const decay = Math.exp(-LAMBDA * elapsedHours);
    const userTrust = report.user.trust_score;
    const reportWeight = userTrust * decay;

    // Save calculated weight on report for transparency
    prisma.report.update({
      where: { id: report.id },
      data: { weight: parseFloat(reportWeight.toFixed(3)) }
    }).catch(err => console.error('Error updating report weight:', err));

    if (report.report_type === 'WORKING' || report.report_type === 'CONFIRM_WORKING') {
      wWorking += reportWeight;
    } else if (report.report_type === 'BROKEN' || report.report_type === 'CONFIRM_BROKEN') {
      wBroken += reportWeight;
    }
  });

  const wTotal = wWorking + wBroken;
  let nextStatus = 'UNCERTAIN';
  let nextConfidence = 0.0;

  // Calculate volume scaling factor: prevent 100% confidence with only 1 report
  const cScale = 1 - Math.exp(-GAMMA * activeReportsCount);

  if (wTotal > 0) {
    const agreement = Math.abs(wWorking - wBroken) / wTotal;
    nextConfidence = agreement * cScale;

    if (wWorking > wBroken) {
      if (nextConfidence >= 0.75) {
        nextStatus = 'VERIFIED_WORKING';
      } else if (nextConfidence >= 0.35) {
        nextStatus = 'LIKELY_WORKING';
      } else {
        nextStatus = 'UNCERTAIN';
      }
    } else if (wBroken > wWorking) {
      if (nextConfidence >= 0.75) {
        nextStatus = 'VERIFIED_BROKEN';
      } else if (nextConfidence >= 0.35) {
        nextStatus = 'LIKELY_BROKEN';
      } else {
        nextStatus = 'UNCERTAIN';
      }
    }
  }

  // 3. Compute Queue Estimate (4-hour rolling window for highly volatile queue estimates)
  const queueWindowLimit = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const queueReports = await prisma.report.findMany({
    where: {
      station_id: stationId,
      created_at: { gte: queueWindowLimit },
      user: {
        account_status: { not: 'SUSPENDED' }
      }
    },
    include: {
      user: true
    }
  });

  let weightedWaitTimeSum = 0;
  let weightQueueSum = 0;

  queueReports.forEach((report) => {
    // Only process reports that actually state queue metrics
    if (report.wait_time > 0 || report.queue_length > 0) {
      const elapsedHours = (now - new Date(report.created_at)) / (1000 * 60 * 60);
      const decay = Math.exp(-LAMBDA_QUEUE * elapsedHours);
      const reportWeight = report.user.trust_score * decay;

      weightedWaitTimeSum += report.wait_time * reportWeight;
      weightQueueSum += reportWeight;
    }
  });

  let nextQueueEstimate = 0.0;
  if (weightQueueSum > 0) {
    nextQueueEstimate = weightedWaitTimeSum / weightQueueSum;
    nextQueueEstimate = Math.round(nextQueueEstimate * 10) / 10; // Round to 1 decimal place
  }

  // 4. Update the station parameters in the database
  const updatedStation = await prisma.chargingStation.update({
    where: { id: stationId },
    data: {
      status: nextStatus,
      confidence_score: parseFloat(nextConfidence.toFixed(3)),
      queue_estimate: nextQueueEstimate,
      total_reports: { increment: 1 }
    }
  });

  // 5. Closed-loop Feedback System: Resolve report statuses and update user reputations
  if (nextStatus !== 'UNCERTAIN' && reports.length > 0) {
    const isStationWorking = nextStatus === 'VERIFIED_WORKING' || nextStatus === 'LIKELY_WORKING';
    
    for (const report of reports) {
      const isReportWorking = report.report_type === 'WORKING' || report.report_type === 'CONFIRM_WORKING';
      const isAligned = isStationWorking === isReportWorking;
      
      // Determine new report validation state
      let reportStatus = isAligned ? 'VERIFIED' : 'CONFLICTED';
      
      await prisma.report.update({
        where: { id: report.id },
        data: { status: reportStatus }
      });

      // Update user trust dynamically (except when user's score was already highly verified in this run)
      // Pass the alignment outcome to the trust score service
      await recordReportResolution(report.user_id, isAligned);
    }
  }

  // Log status change events in analytics logs if state shifted
  if (station.status !== nextStatus) {
    await prisma.analyticsLog.create({
      data: {
        event_type: 'STATUS_CHANGE',
        metadata: {
          stationId,
          stationName: station.name,
          oldStatus: station.status,
          newStatus: nextStatus,
          confidence: parseFloat(nextConfidence.toFixed(3)),
          totalActiveReports: activeReportsCount
        }
      }
    });
  }

  return updatedStation;
};

module.exports = {
  runConsensusEngine
};
