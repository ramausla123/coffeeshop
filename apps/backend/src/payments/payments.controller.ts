import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateMidtransPaymentDto } from './dto/create-midtrans-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('midtrans/health')
  health() {
    return { ok: true };
  }

  @Post('midtrans/create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createMidtransPayment(@Body() body: CreateMidtransPaymentDto) {
    return this.paymentsService.createMidtransPayment(body.orderId);
  }

  @Post('midtrans/notification')
  handleMidtransNotification(@Body() body: unknown) {
    return this.paymentsService.handleMidtransNotification(body as any);
  }
}
