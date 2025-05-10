import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME,
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRATION,
}));

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
}));
