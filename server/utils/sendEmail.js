const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text) => {
  try {
    const msg = {
      to,
      from: 'datachondriaa@gmail.com',
      subject,
      text,
    };
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error.response?.body || error);
    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;