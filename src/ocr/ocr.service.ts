import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class OcrService {
  private readonly ocrUrl: string;

  constructor(private config: ConfigService) {
    this.ocrUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8001';
  }

  async checkHealth(): Promise<{ available: boolean; message?: string }> {
    try {
      const r = await axios.get(`${this.ocrUrl}/health`, { timeout: 10000 });
      return { available: true, ...r.data };
    } catch {
      return { available: false, message: 'OCR service unavailable' };
    }
  }

  async readScale(file: Express.Multer.File) {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname || 'scale.jpg',
      contentType: file.mimetype || 'image/jpeg',
    });

    const response = await axios.post(`${this.ocrUrl}/read-scale`, form, {
      headers: form.getHeaders(),
      timeout: 15000,
    });

    return response.data;
  }
}
