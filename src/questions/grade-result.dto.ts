import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsMongoId()
  questionId: string;

  selected: string;
}

export class GradeResultDto {
  @IsMongoId()
  storyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @IsBoolean()
  @IsOptional()
  penalty?: boolean;

  @IsNumber()
  @IsOptional()
  score?: number;

  @IsNumber()
  @IsOptional()
  correct?: number;

  @IsNumber()
  @IsOptional()
  incorrect?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  @IsOptional()
  details?: {
    question: string;
    correctAnswer: string;
    selected: string;
    correct: boolean;
    type?: string;
  }[];
}
