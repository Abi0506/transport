require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Registration = require('../models/Registration');

async function run() {
  await connectDB();

  const staffRegs = await Registration.find({ userType: 'staff' });
  let updated = 0;

  for (const reg of staffRegs) {
    const nextFeeConcession = 0.80;
    const nextFinalFees = reg.boardingPointFees ? reg.boardingPointFees * (1 - nextFeeConcession) : reg.finalFees;

    const needsUpdate =
      reg.feeConcession !== nextFeeConcession ||
      reg.finalFees !== nextFinalFees;

    if (!needsUpdate) continue;

    reg.feeConcession = nextFeeConcession;
    if (reg.boardingPointFees) {
      reg.finalFees = nextFinalFees;
    }
    await reg.save();
    updated++;
  }

  console.log(`Updated ${updated} staff records with 80% concession and recalculated final fees.`);
  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('Failed to update staff fees:', err);
  try {
    await mongoose.connection.close();
  } catch (_e) {}
  process.exit(1);
});
