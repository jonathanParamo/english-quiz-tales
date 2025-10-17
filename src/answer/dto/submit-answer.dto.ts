import { IsMongoId, IsString, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsMongoId()
  questionId: string;

  @IsMongoId()
  userId: string;

  @IsString()
  selectedOption: string;

  @IsOptional()
  type?: string;
}
