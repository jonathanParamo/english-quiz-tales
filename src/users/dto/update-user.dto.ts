import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.toLowerCase().trim())
  username?: string;

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsIn(['student', 'creator', 'admin', 'god'])
  @Transform(({ value }) => value?.toLowerCase().trim())
  role?: string;
}
