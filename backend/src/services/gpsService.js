/**
 * Calculates the geodetic distance between two coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Validates whether user is within reporting range of the station (default 200m).
 * @param {number} userLat 
 * @param {number} userLng 
 * @param {number} stationLat 
 * @param {number} stationLng 
 * @param {number} thresholdMeters 
 * @returns {{isValid: boolean, distance: number}}
 */
const validateGPSProximity = (userLat, userLng, stationLat, stationLng, thresholdMeters = 200) => {
  const distance = calculateDistance(userLat, userLng, stationLat, stationLng);
  return {
    isValid: distance <= thresholdMeters,
    distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
  };
};

module.exports = {
  calculateDistance,
  validateGPSProximity
};
