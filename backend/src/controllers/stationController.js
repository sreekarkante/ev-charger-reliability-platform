const { prisma } = require('../config/db');
const { calculateDistance } = require('../services/gpsService');

const getAllStations = async (req, res) => {
  try {
    const { charger_type, connector_type, user_lat, user_lng } = req.query;

    // Build filter criteria
    const filters = {};
    if (charger_type) {
      filters.charger_type = charger_type;
    }
    if (connector_type) {
      filters.connector_type = connector_type;
    }

    const stations = await prisma.chargingStation.findMany({
      where: filters
    });

    // If user GPS coordinates are provided, perform smart recommendation scoring
    if (user_lat && user_lng) {
      const lat = parseFloat(user_lat);
      const lng = parseFloat(user_lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        const scoredStations = stations.map((station) => {
          const distance = calculateDistance(lat, lng, station.latitude, station.longitude);
          
          // 1. Status Factor
          let statusScore = 0.4; // Default Uncertain
          if (station.status === 'VERIFIED_WORKING') statusScore = 1.0;
          if (station.status === 'LIKELY_WORKING') statusScore = 0.8;
          if (station.status === 'LIKELY_BROKEN') statusScore = 0.15;
          if (station.status === 'VERIFIED_BROKEN') statusScore = 0.0;

          // 2. Queue Penalty (0 wait time is perfect, 60+ min wait is worst)
          const waitTime = station.queue_estimate || 0;
          const queueFactor = Math.max(0, 1 - waitTime / 60);

          // 3. Distance Factor (Priority within 25km. Exceeding 25km returns low score)
          const distanceFactor = Math.max(0, 1 - distance / 25000);

          // 4. Power Output Factor (150kW+ DC Fast gets maximum score boost)
          const powerFactor = Math.min(1, station.power_output / 150);

          // Weighted Recommendation Score: Status (40%), Queue (20%), Proximity (30%), Power (10%)
          const recommendationScore =
            statusScore * 0.4 +
            queueFactor * 0.2 +
            distanceFactor * 0.3 +
            powerFactor * 0.1;

          return {
            ...station,
            distance: Math.round(distance), // in meters
            recommendation_score: parseFloat(recommendationScore.toFixed(3))
          };
        });

        // Sort by recommendation score descending (highest score first)
        scoredStations.sort((a, b) => b.recommendation_score - a.recommendation_score);
        return res.json(scoredStations);
      }
    }

    // Default sorting by name
    stations.sort((a, b) => a.name.localeCompare(b.name));
    return res.json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    return res.status(500).json({ message: 'An error occurred while fetching stations' });
  }
};

const getStationById = async (req, res) => {
  try {
    const { id } = req.params;

    const station = await prisma.chargingStation.findUnique({
      where: { id },
      include: {
        reports: {
          orderBy: { created_at: 'desc' },
          take: 15,
          include: {
            user: {
              select: {
                name: true,
                trust_score: true,
                account_status: true
              }
            }
          }
        }
      }
    });

    if (!station) {
      return res.status(404).json({ message: 'Charging station not found' });
    }

    return res.json(station);
  } catch (error) {
    console.error('Error fetching station details:', error);
    return res.status(500).json({ message: 'An error occurred while fetching station details' });
  }
};

const createStation = async (req, res) => {
  try {
    const { name, latitude, longitude, charger_type, connector_type, power_output } = req.body;

    if (!name || latitude === undefined || longitude === undefined || !charger_type || !connector_type || !power_output) {
      return res.status(400).json({ message: 'All station properties are required' });
    }

    const newStation = await prisma.chargingStation.create({
      data: {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        charger_type,
        connector_type,
        power_output: parseFloat(power_output),
        status: 'UNCERTAIN',
        confidence_score: 0.0,
        queue_estimate: 0.0
      }
    });

    return res.status(201).json({
      message: 'Charging station successfully created',
      station: newStation
    });
  } catch (error) {
    console.error('Error creating station:', error);
    return res.status(500).json({ message: 'An error occurred while creating the station' });
  }
};

const updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, charger_type, connector_type, power_output, status } = req.body;

    const station = await prisma.chargingStation.findUnique({ where: { id } });
    if (!station) {
      return res.status(404).json({ message: 'Charging station not found' });
    }

    const updated = await prisma.chargingStation.update({
      where: { id },
      data: {
        name: name || station.name,
        latitude: latitude !== undefined ? parseFloat(latitude) : station.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : station.longitude,
        charger_type: charger_type || station.charger_type,
        connector_type: connector_type || station.connector_type,
        power_output: power_output !== undefined ? parseFloat(power_output) : station.power_output,
        status: status || station.status
      }
    });

    return res.json({
      message: 'Charging station successfully updated',
      station: updated
    });
  } catch (error) {
    console.error('Error updating station:', error);
    return res.status(500).json({ message: 'An error occurred while updating the station' });
  }
};

const deleteStation = async (req, res) => {
  try {
    const { id } = req.params;

    const station = await prisma.chargingStation.findUnique({ where: { id } });
    if (!station) {
      return res.status(404).json({ message: 'Charging station not found' });
    }

    await prisma.chargingStation.delete({ where: { id } });
    return res.json({ message: 'Charging station successfully deleted' });
  } catch (error) {
    console.error('Error deleting station:', error);
    return res.status(500).json({ message: 'An error occurred while deleting the station' });
  }
};

module.exports = {
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation
};
