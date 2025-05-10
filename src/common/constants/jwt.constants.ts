export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'my-secret-key',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'my-refresh-secret-key',
  accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h',
  refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  cookieName: 'jwt',
  refreshCookieName: 'jwt_refresh'
};
