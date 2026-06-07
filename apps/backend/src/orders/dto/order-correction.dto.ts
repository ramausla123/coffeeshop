import { IsOptional, IsString, MinLength } from 'class-validator';

export class OrderCorrectionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
