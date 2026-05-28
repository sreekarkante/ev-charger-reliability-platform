const { prisma } = require('../config/db');
const { calculateDistance } = require('./gpsService');

/**
 * Validates report submission behavior for spam or impossible travel speeds.
 * @param {string} userId - ID of the user submitting the report
 * @param {number} currentLat - Latitude of current report
 * @param {number} currentLng - Longitude of current report
 * @returns {Promise<{isAbusive: boolean, reason?: string}>}
 */
const checkAbuseAndTrackHistory = async (userId, currentLat, currentLng) => {
  const now = new Date();
  
  // 1. Fetch user data and recent report history
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2. Frequency limit: Check if the user has made a report within the last 15 seconds (spam prevention)
  if (user.last_report_time) {
    const elapsedSeconds = (now - new Date(user.last_report_time)) / 1000;
    if (elapsedSeconds < 15) {
      return {
        isAbusive: true,
        reason: 'Rate limit exceeded: Please wait 15 seconds between submissions.'
      };
    }
  }

  // 3. Impossible Travel Speed Check
  if (user.last_report_time && user.last_report_lat !== null && user.last_report_lng !== null) {
    const distanceMeters = calculateDistance(
      user.last_report_lat,
      user.last_report_lng,
      currentLat,
      currentLng
    );

    const elapsedHours = (now - new Date(user.last_report_time)) / (1000 * 60 * 60);

    // If distance is significant (e.g. > 500m) and time is non-zero
    if (distanceMeters > 500 && elapsedHours > 0) {
      const speedKmh = (distanceMeters / 1000) / elapsedHours;

      // Check if speed exceeds a high travel velocity threshold (e.g., 150 km/h)
      if (speedKmh > 150) {
        console.warn(`[ABUSE ALERT] User ${user.email} flagged for impossible travel: ${Math.round(speedKmh)} km/h.`);

        // Record infraction in Logs
        await prisma.analyticsLog.create({
          data: {
            event_type: 'SUSPICIOUS_ACTIVITY',
            metadata: {
              userId,
              email: user.email,
              action: 'IMPOSSIBLE_TRAVEL_SPEED',
              calculatedSpeedKmh: Math.round(speedKmh),
              distanceMeters: Math.round(distanceMeters),
              elapsedMinutes: Math.round(elapsedHours * 60 * 10) / 10
            }
          }
        });

        // Penalize User
        let nextStatus = 'ACTIVE';
        let cooldownUntil = null;
        let nextTrustScore = Math.max(0.0, user.trust_score - 0.25); // Large deduction

        // Determine penalty tier by reviewing past log records
        const pastInfractions = await prisma.analyticsLog.count({
          where: {
            event_type: 'SUSPICIOUS_ACTIVITY',
            metadata: {
              path: ['userId'],
              equals: userId
            }
          }
        });

        if (pastInfractions >= 3) {
          nextStatus = 'SUSPENDED';
          await prisma.analyticsLog.create({
            data: {
              event_type: 'ABUSE_BAN',
              metadata: { userId, email: user.email, reason: 'Repeated impossible travel cheating' }
            }
          });
        } else if (pastInfractions >= 2) {
          nextStatus = 'COOLDOWN';
          cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour cooldown lock
        }

        // Apply penalty in User DB record
        await prisma.user.update({
          where: { id: userId },
          data: {
            trust_score: nextTrustScore,
            account_status: nextStatus,
            cooldown_until: cooldownUntil,
            last_report_time: now,
            last_report_lat: currentLat,
            last_report_lng: currentLng
          }
        });

        return {
          isAbusive: true,
          reason: nextStatus === 'SUSPENDED' 
            ? 'Impossible travel velocity detected! Your account has been permanently SUSPENDED.' 
            : nextStatus === 'COOLDOWN'
              ? 'Impossible travel velocity detected! Your account has been put on a 24-hour COOLDOWN lock.'
              : 'Impossible travel velocity detected! Report rejected and trust score reduced.'
        };
      }
    }
  }

  // If no abuse, update user's last tracking info
  await prisma.user.update({
    where: { id: userId },
    data: {
      last_report_time: now,
      last_report_lat: currentLat,
      last_report_lng: currentLng
    }
  });

  return { isAbusive: false };
};

module.exports = {
  checkAbuseAndTrackHistory
};
