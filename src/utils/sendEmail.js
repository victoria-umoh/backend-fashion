import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw Object.assign(new Error('Email delivery is not configured.'), { statusCode: 503 });
  }

  const auth = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
  const transportOptions = process.env.SMTP_HOST
    ? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth,
    }
    : { service: process.env.EMAIL_SERVICE || 'gmail', auth };
  const transporter = nodemailer.createTransport(transportOptions);

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  return transporter.sendMail(mailOptions);
};

export default sendEmail;