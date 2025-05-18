import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      dest: './public/Images/tests',
    }),
  ],
  controllers: [TestController],
})
export class TestModule {}
