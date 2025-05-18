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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

@ApiTags('upload')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {
    // Upload service will ensure directories exist
    console.log('Upload controller initialized');
  }
  @Post('event-banner')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload event banner image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or size',
  })
  @UseInterceptors(
    FileInterceptor('image', {      storage: diskStorage({
        destination: './public/Images/events',
        filename: (req, file, cb) => {
          // Generate a unique name with the original extension
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          console.log('Generated filename:', uniqueName);
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        console.log('File upload attempt:', file.mimetype, file.originalname);
        // Check file type
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          console.log('File rejected - invalid type:', file.mimetype);
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
    }),
  )
  uploadEventBanner(@UploadedFile() file) {
    console.log('File upload handler called. Received file:', file ? 'yes' : 'no');
    if (!file) {
      throw new BadRequestException('File upload failed');
    }

    // Return the file details
    const result = {
      filename: file.filename,
      path: `/Images/events/${file.filename}`,
    };
    
    console.log('Upload successful:', result);
    return result;
  }
}
