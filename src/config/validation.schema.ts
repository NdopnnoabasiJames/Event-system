import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
    
  // Database
  MONGODB_URI: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().required(),

  // Email
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASSWORD: Joi.string().required(),
});
