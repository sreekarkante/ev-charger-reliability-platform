const { prisma } = require('../config/db');
const { validateGPSProximity } = require('../services/gpsService');
const { checkAbuseAndTrackHistory } = require('../services/abuseService');
const { recordReportSubmission } = require('../services/trustService');
const { runConsensusEngine } = require('../services/consensusService');
const { broadcast } = require('../sockets/socketManager');

const createReport = async (req, res) => {
  try {
    const {
      station_id,
      report_type,
      queue_length,
      wait_time,
      image_url,
      gps_latitude,
      gps_longitude
    } = req.body;

    const userId = req.user.id;

    // 1. Validation of fields
    if (!station_id || !report_type || gps_latitude === undefined || gps_longitude === undefined) {
      return res.status(400).json({ message: 'Station ID, report type, and GPS coordinates are required.' });
    }

    const lat = parseFloat(gps_latitude);
    const lng = parseFloat(gps_longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'GPS coordinates must be numeric values.' });
    }

    // Fetch station
    const station = await prisma.chargingStation.findUnique({
      where: { id: station_id }
    });

    if (!station) {
      return res.status(404).json({ message: 'Charging station not found.' });
    }

    // 2. GPS Proximity Verification (must be within 200m)
    const gpsCheck = validateGPSProximity(lat, lng, station.latitude, station.longitude);
    if (!gpsCheck.isValid) {
      return res.status(400).json({
        message: `GPS Verification Failed: You must be physically near the charger to report. Current distance: ${gpsCheck.distance} meters (Limit: 200 meters).`
      });
    }

    // 3. Anti-Spam & Impossible Travel Speed Check
    const abuseCheck = await checkAbuseAndTrackHistory(userId, lat, lng);
    if (abuseCheck.isAbusive) {
      return res.status(403).json({
        message: abuseCheck.reason
      });
    }

    // 4. Create the Report
    const report = await prisma.report.create({
      data: {
        user_id: userId,
        station_id,
        report_type,
        queue_length: queue_length !== undefined ? parseInt(queue_length) : 0,
        wait_time: wait_time !== undefined ? parseInt(wait_time) : 0,
        image_url: image_url || null,
        gps_latitude: lat,
        gps_longitude: lng,
        weight: 1.0, // Calculated dynamically in consensus
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            trust_score: true
          }
        }
      }
    });

    // 5. Update user trust score metrics
    const updatedTrust = await recordReportSubmission(userId);

    // 6. Run consensus engine to update station status & feedback loops
    const updatedStation = await runConsensusEngine(station_id);

    // 7. Log event in analytics database
    await prisma.analyticsLog.create({
      data: {
        event_type: 'NEW_REPORT',
        metadata: {
          reportId: report.id,
          userId,
          stationId: station_id,
          reportType: report_type,
          queueLength: report.queue_length,
          waitTime: report.wait_time
        }
      }
    });

    // 8. Broadcast live updates to WebSockets
    broadcast('station_update', updatedStation);
    broadcast('new_report', {
      report: {
        id: report.id,
        station_id: report.station_id,
        report_type: report.report_type,
        queue_length: report.queue_length,
        wait_time: report.wait_time,
        image_url: report.image_url,
        gps_latitude: report.gps_latitude,
        gps_longitude: report.gps_longitude,
        created_at: report.created_at,
        user: {
          name: report.user.name,
          trust_score: parseFloat(updatedTrust.toFixed(3))
        }
      }
    });

    return res.status(201).json({
      message: 'Report submitted successfully. Proximity verified.',
      report,
      station: updatedStation
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    return res.status(500).json({ message: 'An error occurred during report submission.' });
  }
};

const getReportsByStationId = async (req, res) => {
  try {
    const { id } = req.params;

    const reports = await prisma.report.findMany({
      where: { station_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            trust_score: true,
            account_status: true
          }
        }
      }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Error retrieving station reports:', error);
    return res.status(500).json({ message: 'An error occurred while fetching reports.' });
  }
};

const getReportsByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    const reports = await prisma.report.findMany({
      where: { user_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        station: true
      }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Error retrieving user reports:', error);
    return res.status(500).json({ message: 'An error occurred while fetching reports.' });
  }
};

module.exports = {
  createReport,
  getReportsByStationId,
  getReportsByUserId
};
