import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  IsMongoId,
} from 'class-validator';

export class CreateQuestionDto {
  @IsOptional()
  @IsMongoId()
  storyId?: string;

  @IsIn([
    'multiple',
    'true_false',
    'fill_blank',
    'listening',
    'matching',
    'choose_correct_sentence',
  ])
  type: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  options?: string[];

  @IsOptional()
  correctAnswer: string | string[] | Record<string, any>;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  points?: number;

  @IsString()
  @IsOptional()
  sceneTag?: string;

  @IsIn(['easy', 'medium', 'hard'])
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsString()
  @IsOptional()
  audioUrl?: string;

  @IsString()
  question: string;
}
