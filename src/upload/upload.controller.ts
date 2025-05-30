import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UploadService } from './upload.service';
import { CloudinaryService } from '../common/services/cloudinary.service';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}  @Post('event-image')
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB - Cloudinary can handle larger files
      },
    }),
  )
  async uploadEventImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Upload to Cloudinary
      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'events',
        transformation: {
          width: 1200,
          height: 600,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto'
        }
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'File uploaded successfully to Cloudinary',
        data: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          // For backward compatibility, include filename
          filename: result.public_id,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload image: ${error.message}`);
    }
  }

  // Keep the old endpoint for backward compatibility (event-banner)  @Post('event-banner')
  @Roles(Role.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadEventBanner(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Upload to Cloudinary with event banner specific transformations
      const result = await this.cloudinaryService.uploadImage(file, {
        folder: 'events',
        transformation: {
          width: 1200,
          height: 600,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto'
        }
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Banner uploaded successfully to Cloudinary',
        // For backward compatibility with existing frontend code
        filename: result.public_id,
        data: {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload banner: ${error.message}`);
    }
  }
}
