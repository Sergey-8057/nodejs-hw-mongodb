import nodemailer from 'nodemailer';
import { getEnvVar } from '../../utils/getEnvVar.js';

console.log('SMTP ENV:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  hasPass: !!process.env.SMTP_PASSWORD,
});

export const transporter = nodemailer.createTransport({
  host: getEnvVar('SMTP_HOST'),
  port: Number(getEnvVar('SMTP_PORT')),
  secure: false,
  auth: {
    user: getEnvVar('SMTP_USER'),
    pass: getEnvVar('SMTP_PASSWORD'),
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendEmail = async (options) => {
  return await transporter.sendMail(options);
};
