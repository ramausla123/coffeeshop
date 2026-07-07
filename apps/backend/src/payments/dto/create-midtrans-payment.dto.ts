import { IsInt, Min } from 'class-validator';

export class CreateMidtransPaymentDto {
  @IsInt()
  @Min(1)
  orderId!: number;
}
