import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create/:orderId')
  async createPayment(@Param('orderId') orderId: string) {
    try {
      const result = await this.paymentService.createTransaction(
        parseInt(orderId),
      );
      return result;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('callback')
  async handleCallback(@Body() notification: any) {
    try {
      const result = await this.paymentService.handleCallback(notification);
      return { status: 'ok', order: result };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('status/:orderId')
  async getStatus(@Param('orderId') orderId: string) {
    try {
      const result = await this.paymentService.getPaymentStatus(
        parseInt(orderId),
      );
      return result;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.NOT_FOUND);
    }
  }
}
