import nodemailer from 'nodemailer';

import { getEnvVar } from '../../utils/getEnvVar.js';

const transporter = nodemailer.createTransport({
  host: getEnvVar('SMTP_HOST'),
  port: Number(getEnvVar('SMTP_PORT')),
  secure: false,
  auth: {
    user: getEnvVar('SMTP_USER'),
    pass: getEnvVar('SMTP_PASSWORD'),
  },
  // tls: {
  //   rejectUnauthorized: false,
  // },
});


export const sendEmail = async (options) => {
  return await transporter.sendMail(options);
};
