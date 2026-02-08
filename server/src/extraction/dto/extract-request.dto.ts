import { IsOptional, IsString, Matches } from 'class-validator';

export class ExtractRequestDto {
  @IsString()
  @Matches(
    /^https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\//,
    { message: 'URL must be an Instagram reel, post, or TV link' },
  )
  url!: string;

  /** ISO-639-1 language code (e.g. 'fr', 'en'). Omit for auto-detect. */
  @IsOptional()
  @IsString()
  language?: string;
}
