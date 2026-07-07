import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { OrdersService } from '../orders/orders.service';

type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
};

type SnapTransactionResponse = {
  token: string;
  redirect_url: string;
};

const midtransClient = require('midtrans-client');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  async createMidtransPayment(orderId: number) {
    const order = await this.ordersService.findRawById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order already paid');
    }
    if (order.status === 'canceled') {
      throw new BadRequestException('Order has been canceled');
    }

    const midtransOrderId = order.midtransOrderId || `coffee-${order.id}-${Date.now()}`;
    await this.ordersService.attachMidtransPayment(order.id, midtransOrderId);

    const snap = this.createSnapClient();
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: order.total,
      },
      customer_details: {
        first_name: order.table ? `Meja ${order.table}` : 'Coffee Shop Customer',
      },
    }) as SnapTransactionResponse;

    return {
      orderId: order.id,
      midtransOrderId,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    };
  }

  async handleMidtransNotification(body: MidtransNotification) {
    this.verifySignature(body);

    const midtransOrderId = body.order_id;
    if (!midtransOrderId) {
      throw new BadRequestException('Missing order_id');
    }

    const transactionStatus = body.transaction_status || 'unknown';
    const fraudStatus = body.fraud_status || '';
    const paidStatuses = ['settlement'];
    const isAcceptedCapture = transactionStatus === 'capture' && fraudStatus !== 'deny';

    if (!paidStatuses.includes(transactionStatus) && !isAcceptedCapture) {
      this.logger.log(`Ignored Midtrans notification ${midtransOrderId}: ${transactionStatus}/${fraudStatus}`);
      return { success: true, ignored: true };
    }

    const paidAmount = Number(body.gross_amount || 0);
    const order = await this.ordersService.confirmGatewayPayment(
      midtransOrderId,
      paidAmount,
      transactionStatus,
      body.payment_type || 'midtrans',
    );

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return { success: true, order };
  }

  private createSnapClient() {
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      throw new Error('MIDTRANS_SERVER_KEY is required');
    }

    return new midtransClient.Snap({
      isProduction: this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey,
      clientKey: this.config.get<string>('MIDTRANS_CLIENT_KEY') || '',
    });
  }

  private verifySignature(body: MidtransNotification) {
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      throw new Error('MIDTRANS_SERVER_KEY is required');
    }

    const expected = createHash('sha512')
      .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
      .digest('hex');

    if (body.signature_key !== expected) {
      throw new BadRequestException('Invalid Midtrans signature');
    }
  }
}
