const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const SponsoredStudent = require('../models/SponsoredStudent');

const usage = () => {
  console.log('Usage: node import_scholarship.js /path/to/ExcelFile.xlsx');
  process.exit(1);
}

const run = async () => {
  const filePath = process.argv[2];
  if (!filePath) return usage();

  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  console.log('Connecting to DB:', process.env.MONGO_URI || 'mongodb://localhost:27017/transport');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/transport');

  try {
    const wb = XLSX.readFile(abs);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    let imported = 0;
    for (const r of rows) {
      // Normalize incoming column keys to handle variations (uppercase, spaces, punctuation)
      const normalizedRow = {}
      Object.keys(r).forEach(k => {
        const nk = k.toString().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
        normalizedRow[nk] = r[k]
      })

      const possibleRegisterKeys = ['registernumber', 'regno', 'registerno', 'registerno', 'register']
      const possibleNameKeys = ['name', 'studentname', 'fullname']

      let registerNumber = ''
      for (const k of possibleRegisterKeys) {
        if (normalizedRow[k] !== undefined && normalizedRow[k] !== null && String(normalizedRow[k]).toString().trim() !== '') {
          registerNumber = String(normalizedRow[k]).trim()
          break
        }
      }
      let name = ''
      for (const k of possibleNameKeys) {
        if (normalizedRow[k] !== undefined && normalizedRow[k] !== null && String(normalizedRow[k]).toString().trim() !== '') {
          name = String(normalizedRow[k]).trim()
          break
        }
      }

      if (!registerNumber) continue;
      // Ensure registerNumber is a string (avoid numbers losing leading zeros)
      registerNumber = registerNumber.toString()
      await SponsoredStudent.updateOne({ registerNumber }, { $set: { registerNumber, name } }, { upsert: true })
      imported++
    }

    console.log(`Imported/updated ${imported} sponsored student records.`);
  } catch (err) {
    console.error('Failed to import:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
