import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  UseGuards,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Express } from 'express';

@Controller('test')
export class TestController {
  @Get('upload-form')
  getUploadForm(@Res() res) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test File Upload - Cloudinary</title>
        </head>
        <body>
          <h1>Test File Upload - Now Using Cloudinary</h1>
          <p>File uploads are now handled by Cloudinary. Use the main upload endpoints instead.</p>
          <p>Available endpoints:</p>
          <ul>
            <li>POST /api/upload/event-image</li>
            <li>POST /api/upload/event-banner</li>
          </ul>
        </body>
      </html>
    `;
    return res.send(html);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res) {
    console.log('Test upload - redirecting to Cloudinary-based uploads');
    return res.json({
      message: 'Test upload endpoint deprecated. Use Cloudinary-based endpoints instead.',
      recommendedEndpoints: [
        '/api/upload/event-image',
        '/api/upload/event-banner'
      ],
      uploadedFile: file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      } : null
    });
  }
}
