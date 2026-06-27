const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // Keep registerNumber/employeeId unique, but allow duplicate emails.
    try {
      await conn.connection.db.collection('registrations').dropIndex('mailId_1');
      console.log('Dropped legacy unique index: registrations.mailId_1');
    } catch (idxErr) {
      // Ignore when the index does not exist.
      if (!String(idxErr?.message || '').includes('index not found')) {
        console.warn(`Index migration warning: ${idxErr.message}`);
      }
    }

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
