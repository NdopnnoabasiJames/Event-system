import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../services/cloudinary.service'
import { Event, EventDocument } from '../../schemas/event.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryMigrationService {
  private readonly logger = new Logger(CloudinaryMigrationService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  /**
   * Migrate existing local images to Cloudinary
   */
  async migrateLocalImagesToCloudinary(): Promise<void> {
    this.logger.log('Starting migration of local images to Cloudinary...');

    try {
      // Find all events with local banner images (not URLs)
      const events = await this.eventModel.find({
        bannerImage: {
          $exists: true,
          $ne: null,
          $not: /^https?:\/\//
        }
      });

      this.logger.log(`Found ${events.length} events with local images to migrate`);

      for (const event of events) {
        try {
          await this.migrateEventImage(event);
        } catch (error) {
          this.logger.error(`Failed to migrate image for event ${event._id}: ${error.message}`);
          // Continue with other events
        }
      }

      this.logger.log('Migration completed successfully');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single event's image
   */
  private async migrateEventImage(event: EventDocument): Promise<void> {
    const localImagePath = path.join(
      process.cwd(),
      'public',
      'Images',
      'events',
      event.bannerImage
    );

    // Check if local file exists
    if (!fs.existsSync(localImagePath)) {
      this.logger.warn(`Local image not found: ${localImagePath}`);
      return;
    }

    try {
      // Read the local file
      const fileBuffer = fs.readFileSync(localImagePath);
      const fileExtension = path.extname(event.bannerImage);
      
      // Create a mock file object for Cloudinary upload
      const mockFile = {
        buffer: fileBuffer,
        originalname: event.bannerImage,
        mimetype: this.getMimeType(fileExtension),
      } as Express.Multer.File;

      // Upload to Cloudinary
      const result = await this.cloudinaryService.uploadImage(mockFile, {
        folder: 'events',
        publicId: `migrated_${event._id}`,
        transformation: {
          width: 1200,
          height: 600,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto'
        }
      });      // Update the event with the new Cloudinary public ID
      await this.eventModel.findByIdAndUpdate(event._id, {
        bannerImage: result.public_id,
      });

      this.logger.log(`Successfully migrated image for event: ${event.name} (${event._id})`);
      this.logger.log(`Original: ${event.bannerImage} -> Cloudinary: ${result.public_id}`);

      // Optionally, you can remove the local file after successful migration
      // fs.unlinkSync(localImagePath);

    } catch (error) {
      this.logger.error(`Failed to migrate image for event ${event._id}:`, error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }
  /**
   * Get migration status and statistics
   */
  async getMigrationStatus(): Promise<{
    totalEvents: number;
    localImageEvents: number;
    cloudinaryEvents: number;
  }> {
    const totalEvents = await this.eventModel.countDocuments();
    
    const localImageEvents = await this.eventModel.countDocuments({
      bannerImage: {
        $exists: true,
        $ne: null,
        $not: /^https?:\/\//
      }
    });
    
    const cloudinaryEvents = await this.eventModel.countDocuments({
      bannerImage: {
        $exists: true,
        $ne: null,
        $regex: /^https?:\/\//
      }
    });

    return {
      totalEvents,
      localImageEvents,
      cloudinaryEvents
    };
  }

  /**
   * Clean up local images after manual verification
   */
  async cleanupLocalImages(): Promise<void> {
    this.logger.log('Starting cleanup of local images...');

    try {
      const eventsDir = path.join(process.cwd(), 'public', 'Images', 'events');
      
      if (!fs.existsSync(eventsDir)) {
        this.logger.log('Events directory does not exist, nothing to clean up');
        return;
      }

      const files = fs.readdirSync(eventsDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(eventsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          // Check if any event still references this local file
          const eventUsingFile = await this.eventModel.findOne({ bannerImage: file });
          
          if (!eventUsingFile) {
            fs.unlinkSync(filePath);
            this.logger.log(`Deleted orphaned local image: ${file}`);
            deletedCount++;
          } else {
            this.logger.log(`Keeping local image ${file} - still referenced by event: ${eventUsingFile.name}`);
          }
        }
      }

      this.logger.log(`Cleanup completed - deleted ${deletedCount} orphaned files`);
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
      throw error;
    }
  }
}
