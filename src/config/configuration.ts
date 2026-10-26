import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
}));

export const dbConfig = registerAs('db', () => ({
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/goldcraft',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'access_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'refresh_secret',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));

export const bcryptConfig = registerAs('bcrypt', () => ({
  rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
}));

export const treasuryConfig = registerAs('treasury', () => ({
  openingReserveMg: parseInt(
    process.env.TREASURY_OPENING_RESERVE_MG ?? '1000000',
    10,
  ),
}));
