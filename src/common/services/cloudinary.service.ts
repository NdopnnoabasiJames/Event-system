import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.logger.log('Cloudinary service initialized');
  }

  /**
   * Upload image to Cloudinary
   * @param file - The file buffer or path
   * @param options - Upload options
   * @returns Promise<UploadApiResponse>
   */
  async uploadImage(
    file: Express.Multer.File,
    options: {
      folder?: string;
      publicId?: string;
      transformation?: any;
    } = {}
  ): Promise<UploadApiResponse> {
    const { folder = 'events', publicId, transformation } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      // Upload from buffer
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            this.logger.log(`Image uploaded successfully: ${result.public_id}`);
            resolve(result);
          } else {
            reject(new Error('Unknown error occurred during upload'));
          }
        }
      ).end(file.buffer);
    });
  }

  /**
   * Delete image from Cloudinary
   * @param publicId - The public ID of the image to delete
   * @returns Promise<any>
   */
  async deleteImage(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted successfully: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId}:`, error);
      throw error;
    }
  }

  /**
   * Generate optimized URL for image
   * @param publicId - The public ID of the image
   * @param options - Transformation options
   * @returns string - The optimized URL
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto',
      format = 'auto'
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format,
    });
  }

  /**
   * Get URL for event banner with optimized dimensions
   * @param publicId - The public ID of the image
   * @returns string - The optimized URL for event banners
   */
  getEventBannerUrl(publicId: string): string {
    if (!publicId) {
      return 'https://placehold.co/1200x600?text=Event+Banner';
    }

    return this.getOptimizedUrl(publicId, {
      width: 1200,
      height: 600,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
  }

  /**
   * Get URL for event thumbnail
   * @param publicId - The public ID of the image
   * @returns string - The optimized URL for thumbnails
   */
  getEventThumbnailUrl(publicId: string): string {
    if (!publicId) {
      return 'https://placehold.co/400x300?text=Event+Banner';
    }

    return this.getOptimizedUrl(publicId, {
      width: 400,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
  }
}
