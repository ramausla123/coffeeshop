import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as midtransClient from 'midtrans-client';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class PaymentService {
  private snap: any;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {
    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_ENVIRONMENT === 'production',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  async createTransaction(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.paymentStatus === 'paid') {
      throw new Error('Order already paid');
    }

    const parameter = {
      transaction_details: {
        order_id: `ORDER-${order.id}-${Date.now()}`,
        gross_amount: order.total,
      },
      customer_details: {
        first_name: order.table || 'Guest',
      },
      item_details: order.items.map((item: any) => ({
        id: item.menuId,
        price: item.price,
        quantity: item.quantity,
        name: item.name,
      })),
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);
      
      // Save transaction token & order ID to database
      order.paymentToken = transaction.token;
      order.transactionId = transaction.redirect_url; // Store for reference
      order.paymentMethod = 'midtrans';
      order.paymentStatus = 'pending';
      await this.orderRepository.save(order);

      return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      };
    } catch (err) {
      throw new Error(`Midtrans error: ${err.message}`);
    }
  }

  async handleCallback(notification: any) {
    const { order_id, transaction_status, transaction_id } = notification;

    // Extract order ID from order_id field (format: ORDER-{id}-{timestamp})
    const orderId = parseInt(order_id.split('-')[1]);
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Update payment status based on transaction status
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      order.paymentStatus = 'paid';
    } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
      order.paymentStatus = 'failed';
    } else if (transaction_status === 'pending') {
      order.paymentStatus = 'pending';
    }

    order.transactionId = transaction_id;
    await this.orderRepository.save(order);

    return order;
  }

  async getPaymentStatus(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return {
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
    };
  }
}
