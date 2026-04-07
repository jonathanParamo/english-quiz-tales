import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  IsMongoId,
} from 'class-validator';

export class AnswerDto {
  @IsMongoId()
  questionId!: string;

  @IsString()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.join(',');
    return value ?? '';
  })
  selected!: string;
}

export const QuestionTypes = [
  'multiple',
  'true_false',
  'fill_blank',
  'listening',
  'matching',
  'choose_correct_sentence',
  'write_sentence',
] as const;

export class CreateQuestionDto {
  @IsOptional()
  @IsMongoId()
  storyId?: string;

  @IsIn(QuestionTypes)
  type!: string;

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
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  correctAnswer?: string | string[] | Record<string, any>;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: 'Los puntos deben ser un número válido.' })
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
  question!: string;
}
