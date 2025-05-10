import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Attendee, AttendeeDocument } from '../schemas/attendee.schema';
import { Event, EventDocument } from '../schemas/event.schema';
import { EventReminderContext, EmailTemplate } from '../common/interfaces/notification.interface';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Attendee.name) private attendeeModel: Model<AttendeeDocument>,
    private configService: ConfigService,
  ) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const emailConfig = this.configService.get('email');
    this.transporter = nodemailer.createTransport(emailConfig);
    try {
      await this.transporter.verify();
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error);
    }
  }

  private generateEventReminderTemplate(context: EventReminderContext): EmailTemplate {
    const { attendeeName, eventName, eventDate, eventLocation, transportDetails } = context;
    const formattedDate = new Date(eventDate).toLocaleDateString();
    
    let transportInfo = '';
    if (transportDetails) {
      if (transportDetails.type === 'bus') {
        transportInfo = `
          <p>Your bus details:</p>
          <ul>
            <li>Pickup Location: ${transportDetails.location}</li>
            <li>Departure Time: ${transportDetails.departureTime.toLocaleTimeString()}</li>
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
        Departure Time: ${transportDetails.departureTime.toLocaleTimeString()}
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
    try {
      const emailUser = this.configService.get<string>('email.auth.user');
      await this.transporter.sendMail({
        from: emailUser,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      this.logger.log(`Reminder email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send reminder email to ${to}:`, error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendEventReminders() {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      // Find events happening in 3 days
      const upcomingEvents = await this.eventModel.find({
        date: {
          $gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
          $lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999)),
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
            eventDate: event.date,
            eventLocation: event.branches[0]?.location || 'TBD',
            transportDetails: attendee.transportPreference === 'bus' ? {
              type: 'bus',
              ...attendee.busPickup,
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
