import { IsIn } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsIn(['cash', 'midtrans'])
  paymentMethod!: 'cash' | 'midtrans';
}
