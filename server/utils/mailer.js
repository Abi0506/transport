const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'abishek25052006@gmail.com',
    pass: 'gfiw medh cien gjzm'
  }
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"PSG iTech Transport" <abishek25052006@gmail.com>',
      to,
      subject,
      html
    });
    console.log(`Mail sent to ${to}`);
  } catch (err) {
    console.error('Mail error:', err);
  }
};

module.exports = { sendMail };
