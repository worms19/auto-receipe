import { Module } from '@nestjs/common';
import { ExtractionModule } from './extraction/extraction.module';

@Module({
  imports: [ExtractionModule],
})
export class AppModule {}
