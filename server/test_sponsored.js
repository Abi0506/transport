const mongoose = require('mongoose');
require('dotenv').config();
const SponsoredStudent = require('./models/SponsoredStudent');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Transport').then(async () => {
  console.log('Connected to MongoDB');
  const result = await SponsoredStudent.findOne({ registerNumber: '715523103001' });
  console.log('Found:', !!result);
  if (result) {
    console.log('RegisterNumber:', result.registerNumber);
  }
  process.exit(0);
});
