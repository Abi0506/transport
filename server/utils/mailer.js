const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'abishek25052006@gmail.com',
    pass: 'gfiw medh cien gjzm'
  },
  // Connection pool settings for reliability
  pool: true,
  maxConnections: 3,
  maxMessages: 10
});

// Verify transporter connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('⚠️ Mail transporter verification failed:', error.message);
  } else {
    console.log('✅ Mail transporter ready');
  }
});

const sendMail = async (to, subject, html) => {
  if (!to) {
    console.error('Mail error: No recipient email provided');
    return;
  }
  
  try {
    const info = await transporter.sendMail({
      from: '"PSG iTech Transport" <abishek25052006@gmail.com>',
      to,
      subject,
      html
    });
    console.log(`✅ Mail sent to ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`❌ Mail error to ${to}:`, err.message);
    // Don't throw - email failures shouldn't block registration
    return null;
  }
};

module.exports = { sendMail };
