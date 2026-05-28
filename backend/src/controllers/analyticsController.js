const { prisma } = require('../config/db');

const getSystemAnalytics = async (req, res) => {
  try {
    const totalReports = await prisma.report.count();
    const totalStations = await prisma.chargingStation.count();
    
    // Status distribution
    const statusCounts = await prisma.chargingStation.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const statusMap = {
      VERIFIED_WORKING: 0,
      LIKELY_WORKING: 0,
      UNCERTAIN: 0,
      LIKELY_BROKEN: 0,
      VERIFIED_BROKEN: 0
    };

    statusCounts.forEach((item) => {
      statusMap[item.status] = item._count.id;
    });

    // Average queue time
    const stations = await prisma.chargingStation.findMany({
      select: { queue_estimate: true }
    });
    const avgQueueTime = stations.length > 0
      ? stations.reduce((acc, curr) => acc + curr.queue_estimate, 0) / stations.length
      : 0.0;

    // User status counts
    const userStatuses = await prisma.user.groupBy({
      by: ['account_status'],
      _count: {
        id: true
      }
    });

    const userStatusMap = {
      ACTIVE: 0,
      COOLDOWN: 0,
      SUSPENDED: 0
    };

    userStatuses.forEach((item) => {
      userStatusMap[item.account_status] = item._count.id;
    });

    // Recent logs
    const recentLogs = await prisma.analyticsLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 20
    });

    return res.json({
      totalReports,
      totalStations,
      avgQueueTime: Math.round(avgQueueTime * 10) / 10,
      statusDistribution: statusMap,
      userStatusDistribution: userStatusMap,
      recentLogs
    });
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    return res.status(500).json({ message: 'An error occurred while fetching system analytics' });
  }
};

const getStationAnalytics = async (req, res) => {
  try {
    const stations = await prisma.chargingStation.findMany({
      include: {
        _count: {
          select: { reports: true }
        }
      }
    });

    // Calculate reliable vs problematic stations
    const scoredStations = stations.map(station => {
      let uptimeRating = 0.5; // Default uncertain
      if (station.status === 'VERIFIED_WORKING') uptimeRating = 1.0;
      if (station.status === 'LIKELY_WORKING') uptimeRating = 0.8;
      if (station.status === 'UNCERTAIN') uptimeRating = 0.5;
      if (station.status === 'LIKELY_BROKEN') uptimeRating = 0.2;
      if (station.status === 'VERIFIED_BROKEN') uptimeRating = 0.0;

      return {
        id: station.id,
        name: station.name,
        chargerType: station.charger_type,
        connectorType: station.connector_type,
        status: station.status,
        confidence: station.confidence_score,
        queueEstimate: station.queue_estimate,
        reportsCount: station._count.reports,
        uptimeRating
      };
    });

    // Most reliable: Sorted by uptimeRating and confidence descending
    const mostReliable = [...scoredStations]
      .filter(s => s.status.includes('WORKING'))
      .sort((a, b) => (b.uptimeRating * b.confidence) - (a.uptimeRating * a.confidence))
      .slice(0, 5);

    // Most problematic: Sorted by uptimeRating ascending and confidence descending (meaning verified broken or highly likely broken)
    const mostProblematic = [...scoredStations]
      .filter(s => s.status.includes('BROKEN'))
      .sort((a, b) => a.uptimeRating - b.uptimeRating || b.confidence - a.confidence)
      .slice(0, 5);

    return res.json({
      allStationsSummary: scoredStations,
      mostReliable,
      mostProblematic
    });
  } catch (error) {
    console.error('Error fetching station analytics:', error);
    return res.status(500).json({ message: 'An error occurred while fetching station analytics' });
  }
};

const getUserAnalytics = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trust_score: true,
        total_reports: true,
        verified_correct_reports: true,
        account_status: true,
        cooldown_until: true,
        created_at: true
      }
    });

    // Trust Score distribution bins
    const trustDistribution = {
      highTrust: 0,   // 0.8 - 1.0
      mediumTrust: 0, // 0.5 - 0.79
      lowTrust: 0,    // 0.2 - 0.49
      suspicious: 0   // 0.0 - 0.19
    };

    users.forEach((user) => {
      const score = user.trust_score;
      if (score >= 0.8) trustDistribution.highTrust++;
      else if (score >= 0.5) trustDistribution.mediumTrust++;
      else if (score >= 0.2) trustDistribution.lowTrust++;
      else trustDistribution.suspicious++;
    });

    // Suspicious Users list
    const suspiciousUsers = users.filter(user => 
      user.trust_score < 0.20 || 
      user.account_status === 'SUSPENDED' || 
      user.account_status === 'COOLDOWN'
    );

    return res.json({
      trustDistribution,
      suspiciousUsers,
      totalUsers: users.length,
      usersList: users
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return res.status(500).json({ message: 'An error occurred while fetching user analytics' });
  }
};

// Admin route to moderate user account status
const updateUserAccountStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, cooldownHours } = req.body; // status: 'ACTIVE', 'COOLDOWN', 'SUSPENDED'

    if (!['ACTIVE', 'COOLDOWN', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid account status option' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    let cooldownUntil = null;
    if (status === 'COOLDOWN') {
      const hours = cooldownHours ? parseInt(cooldownHours) : 24;
      cooldownUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        account_status: status,
        cooldown_until: cooldownUntil,
        // If restoring a user to active status, we reset their trust score slightly as a second chance
        trust_score: status === 'ACTIVE' && user.trust_score < 0.25 ? 0.35 : user.trust_score
      }
    });

    // Log the moderation action
    await prisma.analyticsLog.create({
      data: {
        event_type: 'ABUSE_BAN',
        metadata: {
          adminUserId: req.user.id,
          targetUserId: userId,
          targetUserEmail: user.email,
          previousStatus: user.account_status,
          newStatus: status,
          cooldownUntil
        }
      }
    });

    return res.json({
      message: `User status successfully updated to ${status}`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        accountStatus: updatedUser.account_status,
        trustScore: updatedUser.trust_score,
        cooldownUntil: updatedUser.cooldown_until
      }
    });
  } catch (error) {
    console.error('Error moderating user account status:', error);
    return res.status(500).json({ message: 'An error occurred while moderating user status' });
  }
};

module.exports = {
  getSystemAnalytics,
  getStationAnalytics,
  getUserAnalytics,
  updateUserAccountStatus
};
