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
      this.logger.error('Failed to initialize email transporter:', error?.message || 'Unknown error');
      this.logger.warn('Email notifications will be disabled');
    }
  }
  private generateEventReminderTemplate(context: EventReminderContext): EmailTemplate {
    const { attendeeName, eventName, eventDate, eventLocation, transportDetails } = context;
    
    // Format the date - eventDate is already a string
    const dateObj = new Date(eventDate);
    const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : eventDate;
    
    let transportInfo = '';
    if (transportDetails) {
      if (transportDetails.type === 'bus') {
        // Safe access to properties with null coalescing
        const pickupLocation = transportDetails.location || 'TBD';
        let departureTime = 'TBD';
        
        if (transportDetails.departureTime) {
          // Format the departure time if it exists
          const departureTimeObj = new Date(transportDetails.departureTime);
          
          departureTime = !isNaN(departureTimeObj.getTime()) ? 
            departureTimeObj.toLocaleTimeString() : transportDetails.departureTime || 'TBD';
        }
        
        transportInfo = `
          <p>Your bus details:</p>
          <ul>
            <li>Pickup Location: ${pickupLocation}</li>
            <li>Departure Time: ${departureTime}</li>
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
        Pickup Location: ${transportDetails.location || 'TBD'}
        Departure Time: ${transportDetails.departureTime ? 
          new Date(transportDetails.departureTime).toLocaleTimeString() : 'TBD'}
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
      this.logger.error(`Failed to send email to ${to}:`, error?.message || 'Unknown error');
      // Try to reinitialize transporter for next time
      await this.initializeTransporter();
    }
  }
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendEventReminders() {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      // Create date objects for start and end of the target day
      const startOfDay = new Date(threeDaysFromNow);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(threeDaysFromNow);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Find events happening in 3 days - using ISO string format to match with string date field
      const startOfDayStr = startOfDay.toISOString().split('T')[0];
      const endOfDayStr = endOfDay.toISOString().split('T')[0];
      
      this.logger.log(`Finding events scheduled between ${startOfDayStr} and ${endOfDayStr}`);
      
      // Since date is stored as string in the schema, we need to query using string comparison
      const upcomingEvents = await this.eventModel.find({
        date: startOfDayStr, // Exact date match
        isActive: true,
      });
      
      this.logger.log(`Found ${upcomingEvents.length} events scheduled for ${startOfDayStr}`);
      
      for (const event of upcomingEvents) {
        try {
          // Safeguard in case we somehow got an event without an _id
          if (!event._id) {
            this.logger.warn('Found event without ID, skipping');
            continue;
          }

          // Log the event structure to help debug any schema issues
          this.logger.log(`Processing event: ${event.name}, ID: ${event._id}`);
          
          // Find attendees for this event
          const attendees = await this.attendeeModel
            .find({ event: event._id })
            .exec();
            
          this.logger.log(`Processing ${attendees.length} attendees for event: ${event.name}`);
        
          for (const attendee of attendees) {
            try {
              // Skip if the attendee doesn't have an email
              if (!attendee.email) {
                this.logger.warn(`Attendee ${attendee._id} has no email, skipping notification`);
                continue;
              }
                // Find branch and state information
              let eventLocation = 'TBD';
              if (event.availableBranches && event.availableBranches.length > 0) {
                // We need to populate branch names
                eventLocation = `Event Location`;
              }
              
              // Handle transport details
              let transportDetails = null;
              if (attendee.transportPreference === 'bus') {
                transportDetails = {
                  type: 'bus' as const,
                  location: 'Pickup Station', // This should be retrieved from the pickup station
                  departureTime: attendee.departureTime || null,
                };
              } else if (attendee.transportPreference === 'private') {
                transportDetails = { 
                  type: 'private' as const
                };
              }
              
              const reminderContext: EventReminderContext = {
                attendeeName: attendee.name || 'Attendee',
                eventName: event.name,
                eventDate: event.date,
                eventLocation: eventLocation,
                transportDetails: transportDetails,
              };

              const template = this.generateEventReminderTemplate(reminderContext);
              await this.sendEmail(attendee.email, template);
            } catch (attendeeError) {
              // Log but continue processing other attendees
              this.logger.error(`Error processing attendee ${attendee._id}:`, attendeeError?.message || 'Unknown error');
            }
          }
        } catch (eventError) {
          // Log but continue processing other events
          this.logger.error(`Error processing event ${event._id || 'unknown'}:`, eventError?.message || 'Unknown error');
        }
      }
    } catch (error) {
      this.logger.error('Failed to send event reminders:', error?.message || 'Unknown error', error?.stack);
    }
  }
}