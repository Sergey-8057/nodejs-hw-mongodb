import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

import { FIFTEEN_MINUTES, THIRTY_DAYS } from '../constants/index.js';
import { UsersCollection } from '../db/models/user.js';
import { SessionsCollection } from '../db/models/session.js';
import { sendEmail, transporter } from '../utils/sendMail.js';
import { getEnvVar } from '../../utils/getEnvVar.js';

export const registerUser = async (payload) => {
  const user = await UsersCollection.findOne({ email: payload.email });
  if (user) throw createHttpError(409, 'Email in use');

  const encryptedPassword = await bcrypt.hash(payload.password, 10);

  return await UsersCollection.create({
    ...payload,
    password: encryptedPassword,
  });
};

export const loginUser = async (payload) => {
  const user = await UsersCollection.findOne({ email: payload.email });
  if (!user) {
    throw createHttpError(401, 'User not found');
  }
  const isEqual = await bcrypt.compare(payload.password, user.password); // Порівнюємо хеші паролів

  if (!isEqual) {
    throw createHttpError(401, 'Unauthorized');
  }

  await SessionsCollection.deleteOne({ userId: user._id });

  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  return await SessionsCollection.create({
    userId: user._id,
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + THIRTY_DAYS),
  });
};

export const logoutUser = async (sessionId) => {
  await SessionsCollection.deleteOne({ _id: sessionId });
};

const createSession = () => {
  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  return {
    accessToken,
    refreshToken,
    accessTokenValidUntil: new Date(Date.now() + FIFTEEN_MINUTES),
    refreshTokenValidUntil: new Date(Date.now() + THIRTY_DAYS),
  };
};

export const refreshUsersSession = async ({ sessionId, refreshToken }) => {
  const session = await SessionsCollection.findOne({
    _id: sessionId,
    refreshToken,
  });

  if (!session) {
    throw createHttpError(401, 'Session not found');
  }

  const isSessionTokenExpired =
    new Date() > new Date(session.refreshTokenValidUntil);

  if (isSessionTokenExpired) {
    throw createHttpError(401, 'Session token expired');
  }

  const newSession = createSession();

  await SessionsCollection.deleteOne({ _id: sessionId, refreshToken });

  return await SessionsCollection.create({
    userId: session.userId,
    ...newSession,
  });
};

// export const requestResetToken = async (email) => {
//   const user = await UsersCollection.findOne({ email });
//   if (!user) {
//     throw createHttpError(404, 'User not found');
//   }

//   const resetToken = jwt.sign(
//     {
//       sub: user._id,
//       email,
//     },
//     getEnvVar('JWT_SECRET'),
//     {
//       expiresIn: '5m',
//     },
//   );
//   console.log('SMTP Configuration:', {
//     host: getEnvVar('SMTP_HOST'),
//     port: Number(getEnvVar('SMTP_PORT')),
//     user: getEnvVar('SMTP_USER'),
//     from: getEnvVar('SMTP_FROM'),
//     hasPassword: !!getEnvVar('SMTP_PASSWORD'),
//   });

//   try {
//     await sendEmail({
//       from: getEnvVar('SMTP_FROM'),
//       to: email,
//       subject: 'Reset your password',
//       html: `<p>Click <a href="${resetToken}">here</a> to reset your password!</p>`,
//     });
//   } catch (error) {
//     console.error('EMAIL SEND ERROR:', error);
//     throw new createHttpError(
//       500,
//       'Failed to send email,please try again later',
//     );
//   }
// };

export const requestResetToken = async (email) => {
  const user = await UsersCollection.findOne({ email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const resetToken = jwt.sign(
    {
      sub: user._id,
      email,
    },
    getEnvVar('JWT_SECRET'),
    {
      expiresIn: '5m',
    },
  );

  // Детальное логирование конфигурации
  console.log('SMTP Configuration:', {
    host: getEnvVar('SMTP_HOST'),
    port: Number(getEnvVar('SMTP_PORT')),
    user: getEnvVar('SMTP_USER'),
    from: getEnvVar('SMTP_FROM'),
    hasPassword: !!getEnvVar('SMTP_PASSWORD'),
  });

  try {
    // Сначала проверяем соединение
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const emailOptions = {
      from: getEnvVar('SMTP_FROM'),
      to: email,
      subject: 'Reset your password',
      html: `<p>Click <a href="${resetToken}">here</a> to reset your password!</p>`,
    };

    console.log('Sending email with options:', {
      from: emailOptions.from,
      to: emailOptions.to,
      subject: emailOptions.subject,
    });

    const result = await sendEmail(emailOptions);
    console.log('Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('EMAIL SEND ERROR DETAILS:', {
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack,
    });
    throw new createHttpError(
      500,
      'Failed to send email, please try again later',
    );
  }
};
