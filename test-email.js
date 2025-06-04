const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConnection() {
  console.log('Testing email connection...');
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Password configured:', process.env.EMAIL_PASSWORD ? 'YES' : 'NO');
  console.log('SMTP Host:', process.env.SMTP_HOST);
  console.log('SMTP Port:', process.env.SMTP_PORT);

  // Test 1: Gmail Service
  console.log('\n=== Test 1: Using Gmail Service ===');
  try {
    const transporter1 = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    await transporter1.verify();
    console.log('✅ Gmail service connection successful!');
  } catch (error) {
    console.log('❌ Gmail service connection failed:', error.message);
  }

  // Test 2: Manual SMTP Configuration
  console.log('\n=== Test 2: Using Manual SMTP Configuration ===');
  try {
    const transporter2 = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    await transporter2.verify();
    console.log('✅ Manual SMTP connection successful!');
  } catch (error) {
    console.log('❌ Manual SMTP connection failed:', error.message);
  }

  // Test 3: Alternative SMTP settings
  console.log('\n=== Test 3: Using Alternative Gmail SMTP Settings ===');
  try {
    const transporter3 = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    await transporter3.verify();
    console.log('✅ Alternative Gmail SMTP (port 465) connection successful!');
  } catch (error) {
    console.log('❌ Alternative Gmail SMTP connection failed:', error.message);
  }
}

testEmailConnection().catch(console.error);
