const { prisma } = require('../config/db');

// Laplace Smoothing Parameters
const ALPHA = 1.5; // Pseudo-correct reports
const BETA = 3.0;  // Pseudo-total reports

/**
 * Recalculates and updates the trust score of a user using Laplace Smoothing.
 * Formula: TrustScore = (VerifiedCorrectReports + ALPHA) / (TotalReports + BETA)
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} The updated trust score
 */
const recalculateUserTrust = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Calculate smoothed score
  const rawScore = (user.verified_correct_reports + ALPHA) / (user.total_reports + BETA);
  
  // Constrain trust score between 0.0 and 1.0
  const trustScore = Math.max(0.0, Math.min(1.0, rawScore));
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { trust_score: trustScore }
  });

  // Track suspicious users (score < 0.20)
  if (trustScore < 0.20) {
    console.warn(`[TRUST WARNING] User ${user.email} is flagged as SUSPICIOUS (Trust Score: ${trustScore.toFixed(2)})`);
    
    // Log as a suspicious user activity if not already logged recently
    await prisma.analyticsLog.create({
      data: {
        event_type: 'SUSPICIOUS_ACTIVITY',
        metadata: {
          userId,
          email: user.email,
          action: 'LOW_REPUTATION_ALERT',
          trustScore: parseFloat(trustScore.toFixed(3)),
          totalReports: user.total_reports,
          verifiedCorrectReports: user.verified_correct_reports
        }
      }
    });
  }

  return trustScore;
};

/**
 * Handles recording a new report submission by a user.
 * Total reports increments.
 * @param {string} userId 
 */
const recordReportSubmission = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      total_reports: { increment: 1 }
    }
  });

  return await recalculateUserTrust(userId);
};

/**
 * Updates a user's reputation outcomes based on consensus alignment.
 * @param {string} userId 
 * @param {boolean} isCorrect - Whether the user's report matched the final consensus outcome
 */
const recordReportResolution = async (userId, isCorrect) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      verified_correct_reports: { increment: isCorrect ? 1 : 0 }
    }
  });

  return await recalculateUserTrust(userId);
};

module.exports = {
  recalculateUserTrust,
  recordReportSubmission,
  recordReportResolution
};
