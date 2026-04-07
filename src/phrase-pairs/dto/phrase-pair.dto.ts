import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PhraseLevels = ['beginner', 'intermediate', 'advanced'] as const;
export type PhraseLevel = (typeof PhraseLevels)[number];
export const PhraseTypes = [
  'simple',
  'continuous',
  'perfect',
  'perfect continuous',
] as const;

export type PhraseType = (typeof PhraseTypes)[number];

export class CreatePhrasePairDto {
  @IsString()
  @IsNotEmpty({ message: 'The Spanish phrase is required.' })
  @MinLength(1)
  spanish!: string;

  @IsString()
  @IsNotEmpty({ message: 'The English phrase is required.' })
  @MinLength(1)
  english!: string;

  @IsIn(PhraseLevels, {
    message: 'Level must be beginner, intermediate or advanced.',
  })
  @IsOptional()
  level?: PhraseLevel;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  audioEs?: string;

  @IsString()
  @IsOptional()
  audioEn?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsIn(PhraseTypes, {
    message: 'Type must be simple, continuous, perfect or perfect continuous.',
  })
  @IsOptional()
  type?: PhraseType;
}

export class CreatePhrasePairBulkItemDto {
  @IsString()
  @IsNotEmpty()
  spanish!: string;

  @IsString()
  @IsNotEmpty()
  english!: string;

  @IsIn(PhraseLevels)
  @IsOptional()
  level?: PhraseLevel;

  @IsString()
  @IsOptional()
  category?: string;

  @IsIn(PhraseTypes, {
    message: 'Type must be simple, continuous, perfect or perfect continuous.',
  })
  @IsOptional()
  type?: PhraseType;
}

export class CreatePhrasePairBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhrasePairBulkItemDto)
  pairs!: CreatePhrasePairBulkItemDto[];

  @IsIn(PhraseTypes)
  @IsOptional()
  type?: PhraseType;
}

export class UpdatePhrasePairDto {
  @IsString()
  @IsOptional()
  spanish?: string;

  @IsString()
  @IsOptional()
  english?: string;

  @IsIn(PhraseLevels)
  @IsOptional()
  level?: PhraseLevel;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  audioEs?: string;

  @IsString()
  @IsOptional()
  audioEn?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsIn(PhraseTypes)
  @IsOptional()
  type?: PhraseType;
}
