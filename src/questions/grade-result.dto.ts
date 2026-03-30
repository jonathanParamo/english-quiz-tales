import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AnswerDto {
  @IsMongoId()
  questionId: string;

  @IsString()
  type: string;

  @IsString()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.join(',');
    }
    return value ?? '';
  })
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
}
