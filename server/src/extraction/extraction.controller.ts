import { Body, Controller, Post } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { ExtractRequestDto } from './dto/extract-request.dto';
import { ExtractResponseDto } from './dto/extract-response.dto';

@Controller()
export class ExtractionController {
  constructor(private readonly extraction: ExtractionService) {}

  @Post('extract')
  async extract(@Body() dto: ExtractRequestDto): Promise<ExtractResponseDto> {
    return this.extraction.extract(dto.url, dto.language);
  }
}
