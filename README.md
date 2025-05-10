<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Event Management System

A robust event management system built with NestJS, allowing organizations to manage events, marketers, and attendees efficiently.

## Features

- 🔐 Authentication & Authorization with JWT
- 👥 User Roles (Admin, Marketer)
- 📅 Event Management
- 🎫 Attendee Registration
- 🚌 Transportation Management
- 📧 Email Notifications
- 🔄 Rate Limiting
- 📝 Logging System
- 🛡️ Input Validation
- 📊 Pagination Support

## Technical Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT & Passport
- **Email**: Nodemailer
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Rate Limiting**: @nestjs/throttler

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- NPM or Yarn
- Gmail account (for email notifications)

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_uri
MONGODB_DB_NAME=EventSystem

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=1d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

### Authentication Endpoints

#### POST /auth/register
Register a new user
- Body: `{ name: string, email: string, password: string, phone: string }`
- Response: User object without password

#### POST /auth/login
Login with credentials
- Body: `{ email: string, password: string }`
- Response: `{ access_token: string }`

### Events Endpoints

#### GET /events
Get all events
- Auth: Required
- Query Parameters: 
  - page: number
  - limit: number
  - sort: string
  - order: 'asc' | 'desc'

#### POST /events
Create a new event (Admin only)
- Auth: Required
- Role: Admin
- Body: 
```json
{
  "name": string,
  "date": Date,
  "state": string,
  "maxAttendees": number,
  "branches": Array<{
    name: string,
    location: string
  }>,
  "busPickups": Array<{
    location: string,
    departureTime: Date,
    maxCapacity: number
  }>
}
```

#### GET /events/:id
Get event by ID
- Auth: Required

#### POST /events/:id/bus-pickup
Add bus pickup to event (Admin only)
- Auth: Required
- Role: Admin
- Body: `{ location: string, departureTime: Date }`

### Marketers Endpoints

#### GET /marketers/events/available
Get available events for marketers
- Auth: Required
- Role: Marketer

#### POST /marketers/events/:eventId/volunteer
Volunteer for an event
- Auth: Required
- Role: Marketer

#### POST /marketers/events/:eventId/attendees
Register an attendee for an event
- Auth: Required
- Role: Marketer
- Body:
```json
{
  "name": string,
  "email": string,
  "phone": string,
  "transportPreference": "bus" | "private",
  "busPickup": {
    "location": string,
    "departureTime": Date
  }
}
```

### Attendees Endpoints

#### GET /attendees
Get all attendees (Admin/Marketer)
- Auth: Required
- Role: Admin, Marketer
- Query Parameters:
  - eventId?: string
  - transport?: "bus" | "private"

#### PATCH /attendees/:id
Update attendee information
- Auth: Required
- Role: Marketer
- Body: Partial<AttendeeDto>

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting

- Short window: 10 requests per minute
- Long window: 100 requests per hour

## Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Logging

Logs are stored in the `logs` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
