import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Attendee, AttendeeDocument } from '../schemas/attendee.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { EventReminderContext, EmailTemplate } from '../common/interfaces/notification.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isEmailConfigured: boolean = false;
  
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Attendee.name) private readonly attendeeModel: Model<AttendeeDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter() {
    const emailUser = this.configService.get<string>('email.auth.user');
    const emailPass = this.configService.get<string>('email.auth.pass');

    if (!emailUser || !emailPass) {
      this.logger.warn('Email configuration is missing. Email notifications will be disabled.');
      this.isEmailConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('email.host', 'smtp.gmail.com'),
        port: this.configService.get('email.port', 587),
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false // Only for development
        }
      });

      // Verify connection configuration
      await this.transporter.verify();
      this.isEmailConfigured = true;
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.isEmailConfigured = false;
      this.logger.error('Failed to initialize email transporter:', error.message);
      this.logger.warn('Email notifications will be disabled');
    }
  }
  private generateEventReminderTemplate(context: EventReminderContext): EmailTemplate {
    const { attendeeName, eventName, eventDate, eventLocation, transportDetails } = context;
    const formattedDate = new Date(eventDate).toLocaleDateString();
    
    let transportInfo = '';
    if (transportDetails) {
      if (transportDetails.type === 'bus') {
        // Format the departure time string (which is ISO 8601) to a readable time
        const departureTimeFormatted = transportDetails.departureTime ? 
          new Date(transportDetails.departureTime).toLocaleTimeString() : 'TBD';
        
        transportInfo = `
          <p>Your bus details:</p>
          <ul>
            <li>Pickup Location: ${transportDetails.location}</li>
            <li>Departure Time: ${departureTimeFormatted}</li>
          </ul>
        `;
      } else {
        transportInfo = '<p>You have selected private transport for this event.</p>';
      }
    }

    return {
      subject: `Reminder: ${eventName} in 3 Days`,
      text: `
        Hello ${attendeeName},
        
        This is a friendly reminder that ${eventName} is happening in 3 days on ${formattedDate}.
        
        Location: ${eventLocation}
          ${transportDetails ? `Transport: ${transportDetails.type}` : ''}
        ${transportDetails?.type === 'bus' ? `
        Pickup Location: ${transportDetails.location}
        Departure Time: ${transportDetails.departureTime ? new Date(transportDetails.departureTime).toLocaleTimeString() : 'TBD'}
        ` : ''}
        
        We look forward to seeing you there!
        
        Best regards,
        Event Management Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Event Reminder</h2>
          <p>Hello ${attendeeName},</p>
          
          <p>This is a friendly reminder that <strong>${eventName}</strong> is happening in 3 days on <strong>${formattedDate}</strong>.</p>
          
          <p><strong>Location:</strong> ${eventLocation}</p>
          
          ${transportInfo}
          
          <p>We look forward to seeing you there!</p>
          
          <p>Best regards,<br>Event Management Team</p>
        </div>
      `,
    };
  }

  private async sendEmail(to: string, template: EmailTemplate) {
    if (!this.isEmailConfigured || !this.transporter) {
      this.logger.warn(`Email to ${to} was not sent: Email service is not configured`);
      return;
    }

    try {
      const emailUser = this.configService.get<string>('email.auth.user');
      await this.transporter.sendMail({
        from: emailUser,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error.message);
      // Try to reinitialize transporter for next time
      await this.initializeTransporter();
    }
  }
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendEventReminders() {    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      // Create separate date objects to avoid mutating the same one
      const startDate = new Date(threeDaysFromNow);
      const endDate = new Date(threeDaysFromNow);
      
      // Convert date to ISO string for comparison with stored string dates
      const startOfDay = new Date(startDate.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(endDate.setHours(23, 59, 59, 999)).toISOString();
        // Find events happening in 3 days
      const upcomingEvents = await this.eventModel.find({
        date: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        isActive: true,
      });
      
      for (const event of upcomingEvents) {
        const attendees = await this.attendeeModel
          .find({ event: event._id })
          .populate('event')
          .exec();
          
        for (const attendee of attendees) {
          const reminderContext: EventReminderContext = {
            attendeeName: attendee.name,
            eventName: event.name,
            eventDate: event.date, // Already a string now
            eventLocation: event.branches[0]?.location || 'TBD',
            transportDetails: attendee.transportPreference === 'bus' ? {
              type: 'bus',
              location: attendee.busPickup.location,
              departureTime: typeof attendee.busPickup.departureTime === 'string' 
                ? attendee.busPickup.departureTime
                : (attendee.busPickup.departureTime instanceof Date 
                  ? attendee.busPickup.departureTime.toISOString() 
                  : String(attendee.busPickup.departureTime)),
              // Copy other properties if needed
              pickupPoint: attendee.busPickup.pickupPoint,
              busNumber: attendee.busPickup.busNumber,
              driverContact: attendee.busPickup.driverContact,
            } : { type: 'private' },
          };

          const template = this.generateEventReminderTemplate(reminderContext);
          await this.sendEmail(attendee.email, template);
        }
      }
    } catch (error) {
      this.logger.error('Failed to send event reminders:', error);
    }
  }
}
