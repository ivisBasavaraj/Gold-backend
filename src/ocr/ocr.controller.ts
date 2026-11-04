import {
  Controller, Post, Get, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, HttpException, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { OcrService } from './ocr.service';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('OCR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check OCR service availability' })
  async health() {
    const result = await this.ocrService.checkHealth();
    return ApiResponse.ok(result);
  }

  @Post('read-scale')
  @ApiOperation({ summary: 'Read weight from scale image via OCR' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async readScale(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image uploaded');
    try {
      const result = await this.ocrService.readScale(file);
      return ApiResponse.ok(result);
    } catch (err: any) {
      if (err?.response?.status) {
        throw new HttpException(
          err.response.data?.detail || 'OCR processing failed',
          err.response.status,
        );
      }
      throw new HttpException('OCR service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
