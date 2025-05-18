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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('test')
export class TestController {
  @Get('upload-form')
  getUploadForm(@Res() res) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test File Upload</title>
        </head>
        <body>
          <h1>Test File Upload</h1>
          <form action="/api/test/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="file" />
            <button type="submit">Upload</button>
          </form>
        </body>
      </html>
    `;
    return res.send(html);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/Images/tests',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res) {
    // Ensure directory exists
    const dir = path.join(process.cwd(), 'public', 'Images', 'tests');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log('Test upload file:', file);
    return res.json({
      originalname: file.originalname,
      filename: file.filename,
    });
  }
}
