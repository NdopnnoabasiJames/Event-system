export const emailTemplates = {
  eventRegistration: {
    subject: 'Event Registration Confirmation',
    template: `
      <h1>Thank you for registering!</h1>
      <p>Dear {{name}},</p>
      <p>Your registration for {{eventName}} has been confirmed.</p>
      <p>Event Details:</p>
      <ul>
        <li>Date: {{eventDate}}</li>
        <li>Time: {{eventTime}}</li>
        <li>Location: {{eventLocation}}</li>
      </ul>
      <p>Your registration ID is: {{registrationId}}</p>
      <p>Please keep this information for your records.</p>
    `,
  },
  eventReminder: {
    subject: 'Event Reminder',
    template: `
      <h1>Event Reminder</h1>
      <p>Dear {{name}},</p>
      <p>This is a reminder that {{eventName}} is starting in 24 hours.</p>
      <p>Event Details:</p>
      <ul>
        <li>Date: {{eventDate}}</li>
        <li>Time: {{eventTime}}</li>
        <li>Location: {{eventLocation}}</li>
      </ul>
      <p>We look forward to seeing you there!</p>
    `,
  },
  passwordReset: {
    subject: 'Password Reset Request',
    template: `
      <h1>Password Reset Request</h1>
      <p>Dear {{name}},</p>
      <p>We received a request to reset your password. Click the link below to reset it:</p>
      <p><a href="{{resetLink}}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>The link will expire in 1 hour.</p>
    `,
  },
  welcomeEmail: {
    subject: 'Welcome to Event System',
    template: `
      <h1>Welcome to Event System!</h1>
      <p>Dear {{name}},</p>
      <p>Thank you for joining Event System. We're excited to have you on board!</p>
      <p>With your account, you can:</p>
      <ul>
        <li>Register for events</li>
        <li>Track your registrations</li>
        <li>Receive updates about upcoming events</li>
      </ul>
      <p>Get started by browsing our upcoming events!</p>
    `,
  },
};
