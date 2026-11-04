import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';

@Module({
  imports: [MulterModule.register()],
  controllers: [OcrController],
  providers: [OcrService],
})
export class OcrModule {}
