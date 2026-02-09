import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExtractionController } from './extraction.controller';
import { ExtractionService } from './extraction.service';
import { ExtractionGateway } from './extraction.gateway';
import { CobaltService } from './cobalt.service';
import { MediaService } from './media.service';
import { WhisperService } from './whisper.service';
import { ClaudeService } from './claude.service';

@Module({
  imports: [HttpModule],
  controllers: [ExtractionController],
  providers: [ExtractionService, ExtractionGateway, CobaltService, MediaService, WhisperService, ClaudeService],
})
export class ExtractionModule {}
