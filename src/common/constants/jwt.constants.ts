export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'your-fallback-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-fallback-refresh-secret-key',
  accessTokenExpiration: '24h', // Fixed expiration time
  refreshTokenExpiration: '7d',
  cookieName: 'jwt',
  refreshCookieName: 'jwt_refresh'
};
