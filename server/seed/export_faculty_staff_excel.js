require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const connectDB = require('../config/db');
const Registration = require('../models/Registration');

const usage = () => {
  console.log('Usage: node seed/export_faculty_staff_excel.js [output-file.xlsx]');
  process.exit(1);
};

const toDateString = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

const formatCellValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(formatCellValue).join(', ');
  if (typeof value === 'object') {
    if (value instanceof mongoose.Types.ObjectId) return String(value);
    if (value._bsontype === 'ObjectId' && typeof value.toString === 'function') return value.toString();
    return JSON.stringify(value);
  }
  return value;
};

async function main() {
  const outputArg = process.argv[2];
  const outputFile = outputArg
    ? (path.isAbsolute(outputArg) ? outputArg : path.join(process.cwd(), outputArg))
    : path.join(process.cwd(), `faculty_staff_export_${new Date().toISOString().slice(0, 10)}.xlsx`);

  await connectDB();

  try {
    const regs = await Registration.find({ userType: { $in: ['faculty', 'staff'] } })
      .sort({ userType: 1, name: 1 })
      .lean();

    const rows = regs.map(reg => {
      const row = {};

      Object.entries(reg).forEach(([key, value]) => {
        row[key] = formatCellValue(value);
      });

      row.createdAt = toDateString(reg.createdAt);
      row.updatedAt = toDateString(reg.updatedAt);
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FacultyStaff');
    XLSX.writeFile(workbook, outputFile);

    console.log(`Exported ${rows.length} faculty/staff record(s) to: ${outputFile}`);
  } catch (err) {
    console.error('Failed to export faculty/staff data:', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(async (err) => {
  console.error('Unexpected error:', err.message || err);
  try {
    await mongoose.connection.close();
  } catch (_e) {}
  process.exit(1);
});
