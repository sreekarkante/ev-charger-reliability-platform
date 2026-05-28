const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const main = async () => {
  try {
    console.log('[SEED] Cleaning database...');
    // Delete in reverse order of dependencies
    await prisma.analyticsLog.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.chargingStation.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('[SEED] Generating passwords...');
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash('adminpassword', salt);
    const userPasswordHash = await bcrypt.hash('userpassword', salt);

    console.log('[SEED] Seeding Users...');
    // 1. Create Admins and Users with various trust profiles
    const admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@charger-admin.com',
        password_hash: adminPasswordHash,
        role: 'ADMIN',
        trust_score: 1.0,
        total_reports: 5,
        verified_correct_reports: 5,
        account_status: 'ACTIVE'
      }
    });

    const elon = await prisma.user.create({
      data: {
        name: 'Elon Tesla',
        email: 'elon@tesla.com',
        password_hash: userPasswordHash,
        role: 'USER',
        trust_score: 0.95,
        total_reports: 20,
        verified_correct_reports: 19,
        account_status: 'ACTIVE'
      }
    });

    const averageJoe = await prisma.user.create({
      data: {
        name: 'Average Joe',
        email: 'average.joe@gmail.com',
        password_hash: userPasswordHash,
        role: 'USER',
        trust_score: 0.52, // Smooth: (2 + 1.5) / (4 + 3) = 3.5 / 7 = 0.5
        total_reports: 4,
        verified_correct_reports: 2,
        account_status: 'ACTIVE'
      }
    });

    const spammerBot = await prisma.user.create({
      data: {
        name: 'Spammer Bot',
        email: 'spammer.bot@gmail.com',
        password_hash: userPasswordHash,
        role: 'USER',
        trust_score: 0.15, // Low trust due to mismatch reports
        total_reports: 10,
        verified_correct_reports: 0,
        account_status: 'ACTIVE'
      }
    });

    const badActor = await prisma.user.create({
      data: {
        name: 'Malicious Actor',
        email: 'malicious.actor@gmail.com',
        password_hash: userPasswordHash,
        role: 'USER',
        trust_score: 0.05,
        total_reports: 8,
        verified_correct_reports: 0,
        account_status: 'SUSPENDED' // Suspended for cheating
      }
    });

    console.log('[SEED] Seeding Charging Stations (Clustered for GPS validation)...');
    // Coords around Domlur/Indiranagar, Bangalore (very close to each other!)
    const stationA = await prisma.chargingStation.create({
      data: {
        name: 'Nexus Tech Park Charger Alpha',
        latitude: 12.9592,
        longitude: 77.6444,
        charger_type: 'DC_FAST',
        connector_type: 'CCS2',
        power_output: 150,
        status: 'VERIFIED_WORKING',
        confidence_score: 0.92,
        queue_estimate: 5.0
      }
    });

    const stationB = await prisma.chargingStation.create({
      data: {
        name: 'Signature Towers Charging Hub',
        latitude: 12.9575,
        longitude: 77.6430,
        charger_type: 'AC',
        connector_type: 'TYPE2',
        power_output: 22,
        status: 'LIKELY_WORKING',
        confidence_score: 0.65,
        queue_estimate: 0.0
      }
    });

    const stationC = await prisma.chargingStation.create({
      data: {
        name: 'Delta Square Supercharger',
        latitude: 12.9610,
        longitude: 77.6465,
        charger_type: 'DC_FAST',
        connector_type: 'NACS',
        power_output: 250,
        status: 'VERIFIED_BROKEN',
        confidence_score: 0.88,
        queue_estimate: 0.0
      }
    });

    const stationD = await prisma.chargingStation.create({
      data: {
        name: 'EcoSpace Green Charger',
        latitude: 12.9560,
        longitude: 77.6405,
        charger_type: 'AC',
        connector_type: 'CCS1',
        power_output: 7.4,
        status: 'UNCERTAIN',
        confidence_score: 0.0,
        queue_estimate: 0.0
      }
    });

    console.log('[SEED] Seeding Initial Reports to establish scores...');
    
    // Station A: Nexus Alpha -> Elon (0.95 trust) reports WORKING + Joe (0.52 trust) reports WORKING. Yields VERIFIED_WORKING.
    await prisma.report.createMany({
      data: [
        {
          user_id: elon.id,
          station_id: stationA.id,
          report_type: 'WORKING',
          queue_length: 1,
          wait_time: 10,
          gps_latitude: 12.95922,
          gps_longitude: 77.64441,
          weight: 0.95,
          status: 'VERIFIED',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hrs ago
        },
        {
          user_id: averageJoe.id,
          station_id: stationA.id,
          report_type: 'CONFIRM_WORKING',
          queue_length: 0,
          wait_time: 0,
          gps_latitude: 12.95918,
          gps_longitude: 77.64438,
          weight: 0.52,
          status: 'VERIFIED',
          created_at: new Date(Date.now() - 15 * 60 * 1000) // 15 mins ago
        }
      ]
    });

    // Station C: Delta Supercharger -> Spammer Bot (0.15) reports WORKING, but Elon (0.95) and Joe (0.52) report BROKEN. Yields VERIFIED_BROKEN.
    await prisma.report.createMany({
      data: [
        {
          user_id: elon.id,
          station_id: stationC.id,
          report_type: 'BROKEN',
          queue_length: 0,
          wait_time: 0,
          gps_latitude: 12.96105,
          gps_longitude: 77.64652,
          weight: 0.95,
          status: 'VERIFIED',
          created_at: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
        },
        {
          user_id: averageJoe.id,
          station_id: stationC.id,
          report_type: 'CONFIRM_BROKEN',
          gps_latitude: 12.96101,
          gps_longitude: 77.64648,
          weight: 0.52,
          status: 'VERIFIED',
          created_at: new Date(Date.now() - 10 * 60 * 1000)
        },
        {
          user_id: spammerBot.id,
          station_id: stationC.id,
          report_type: 'WORKING',
          gps_latitude: 12.96090,
          gps_longitude: 77.64630,
          weight: 0.15,
          status: 'CONFLICTED', // Spammer was wrong
          created_at: new Date(Date.now() - 40 * 60 * 1000)
        }
      ]
    });

    // System Analytics Log Entry
    await prisma.analyticsLog.create({
      data: {
        event_type: 'STATUS_CHANGE',
        metadata: {
          systemSeed: true,
          initialSeedCount: 4,
          createdUsers: 5
        }
      }
    });

    console.log('===================================================');
    console.log('[SEED SUCCESSFUL] Mock data populated successfully!');
    console.log(`- Seeded Users: 5 (1 Admin, 4 Users)`);
    console.log(`- Seeded Stations: 4`);
    console.log(`- Seeded Reports: 5`);
    console.log('---------------------------------------------------');
    console.log('Admin login credentials:');
    console.log('  Email: admin@charger-admin.com');
    console.log('  Password: adminpassword');
    console.log('Elon login credentials:');
    console.log('  Email: elon@tesla.com');
    console.log('  Password: userpassword');
    console.log('===================================================');

  } catch (error) {
    console.error('[SEED ERROR] Seeding database failed:', error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
