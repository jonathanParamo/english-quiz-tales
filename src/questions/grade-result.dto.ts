import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsMongoId()
  questionId: string;

  @IsString()
  type: string;

  @IsOptional()
  selected?: string | string[];
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
}
