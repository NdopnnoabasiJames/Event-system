import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  
  constructor() {
    this.logger.log('UploadService initialized - using Cloudinary for file storage');
  }
  
  // Legacy method kept for backward compatibility
  // All new uploads should use CloudinaryService directly
  public getUploadsPath(type: string): string {
    this.logger.warn(`getUploadsPath called for type: ${type}. Consider using CloudinaryService instead.`);
    return `cloudinary://${type}`;
  }
}
