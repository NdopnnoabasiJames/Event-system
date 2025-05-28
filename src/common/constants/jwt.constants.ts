export const jwtConstants = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiration: process.env.ACCESSTOKENEXPIRATION,
  refreshTokenExpiration: process.env.REFRESHTOKENEXPIRATION,
  cookieName: process.env.COOKIE_NAME,
  refreshCookieName: process.env.REFRESH_COOKIE_NAME
};
