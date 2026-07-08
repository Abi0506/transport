require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Route = require('../models/Route');
const Registration = require('../models/Registration');
const { sendMail } = require('../utils/mailer');

const buildAllocationMail = (registration, route) => {
  const fromMonth = 'August 2026';
  const toMonth = 'July 2027';
  const deadline = '31.07.2026';
  const routeName = `Route ${route.routeNumber} - ${route.routeName}`;
  const boardingPoint = registration.allocatedStop || registration.boardingPoint;
  const totalFees = Math.round(registration.finalFees || registration.boardingPointFees || 0);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151; line-height: 1.6;">
      <h2 style="color: #1d4ed8; text-align: center; margin-bottom: 5px; font-size: 22px; font-weight: bold;">Transport Section PSG iTech</h2>
      <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
      <p>Dear ${registration.name},</p>
      <p><strong>Greetings of the Day !</strong></p>
      <p>Transport section of PSGiTech is happy to <strong>ALLOCATE</strong> you a seat in college bus based on your chosen boardingpoint.</p>
      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tbody>
            <tr style="height: 30px;"><td style="font-weight: bold; width: 40%;">Bus Route:</td><td>${routeName}</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Boarding Point:</td><td>${boardingPoint}</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Duration:</td><td>From ${fromMonth} To ${toMonth}</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Annual Bus Fee:</td><td>₹${totalFees.toLocaleString()}</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Date of Payment:</td><td>On or Before ${deadline}</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Mode of Payment:</td><td>Deduction from salary / cash</td></tr>
          </tbody>
        </table>
      </div>
      <p style="font-size: 14px; font-weight: bold; line-height: 1.5; color: #1e3a8a; background-color: #eff6ff; padding: 12px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
        Kindly get your BUS PASS from the Transport Office (Located between indoor sports stadium and hostel)
      </p>
      <p style="font-size: 14px; margin-top: 20px;">Thank you</p>
      <p style="font-size: 14px; font-weight: bold; margin: 0;">With Regards</p>
      <p style="font-size: 14px; font-weight: bold; margin: 0;">Team Transport</p>
    </div>
  `;
};

async function main() {
  await connectDB();

  const staffRegs = await Registration.find({ userType: 'staff' });
  let emailed = 0;
  let skipped = 0;

  for (const reg of staffRegs) {
    const routeId = reg.allocatedRoute || reg.boardingPointRoute;
    if (!routeId) {
      skipped++;
      console.log(`[SKIP:no route found] staff ${reg.name} (${reg.registerNumber || reg.employeeId || reg._id})`);
      continue;
    }

    const route = await Route.findById(routeId);
    if (!route) {
      skipped++;
      console.log(`[SKIP:route not found] staff ${reg.name} (${reg.registerNumber || reg.employeeId || reg._id}) routeId=${routeId}`);
      continue;
    }

    if (reg.registrationStatus !== 'allocated') {
      console.log(`[INFO:not allocated, will still email] staff ${reg.name} (${reg.registerNumber || reg.employeeId || reg._id})`);
    }

    if (reg.userType === 'staff') {
      reg.feeConcession = 0.80;
      if (reg.boardingPointFees) {
        reg.finalFees = reg.boardingPointFees * 0.20;
      }
      await reg.save();
    }

    if (reg.mailId) {
      await sendMail(reg.mailId, 'Bus Seat Allocated - Faculty / Staff', buildAllocationMail(reg, route));
      emailed++;
    }
  }

  console.log(`Resent allocation mail to ${emailed} staff member(s). Skipped ${skipped}.`);
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('Failed to resend staff allocation mail:', err);
  try {
    await mongoose.connection.close();
  } catch (_e) {}
  process.exit(1);
});
