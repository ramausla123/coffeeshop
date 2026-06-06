import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paidAmount!: number;
}
