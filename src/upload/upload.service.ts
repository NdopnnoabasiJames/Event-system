import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  
  constructor() {
    // Create directories if they don't exist
    this.ensureUploadsDirectoryExists();
  }

  private ensureUploadsDirectoryExists() {
    const eventImagesDir = path.join(process.cwd(), 'public', 'Images', 'events');
    const testsDir = path.join(process.cwd(), 'public', 'Images', 'tests');
    
    // Create directories if they don't exist
    [eventImagesDir, testsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          this.logger.log(`Created directory: ${dir}`);
        } catch (error) {
          this.logger.error(`Failed to create directory ${dir}: ${error.message}`);
        }
      } else {
        this.logger.log(`Directory exists: ${dir}`);
      }
    });
  }
  
  public getUploadsPath(type: string): string {
    return path.join(process.cwd(), 'public', 'Images', type);
  }
}
