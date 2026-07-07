import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersGateway {
  private readonly logger = new Logger(OrdersGateway.name);
  private io: Server | null = null;

  setServer(io: Server) {
    this.io = io;
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.logger.log(`Client connected: ${socket.id}`);

      socket.on('subscribe-orders', (data: { room: string }) => {
        socket.join(data.room || 'orders');
        this.logger.log(`Client ${socket.id} subscribed to room: ${data.room || 'orders'}`);
        socket.emit('subscribed', { success: true });
      });

      socket.on('unsubscribe-orders', (data: { room: string }) => {
        socket.leave(data.room || 'orders');
        this.logger.log(`Client ${socket.id} unsubscribed from room: ${data.room || 'orders'}`);
        socket.emit('unsubscribed', { success: true });
      });

      socket.on('disconnect', () => {
        this.logger.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Broadcast paid orders to the kitchen queue.
  broadcastNewOrder(order: Order) {
    if (!this.io) return;
    this.io.to('kitchen').emit('order:new', order);
    this.logger.log(`Broadcasted kitchen order #${order.id}`);
  }

  // Broadcast order status update
  broadcastOrderUpdate(order: Order) {
    if (!this.io) return;
    this.io.to('orders').emit('order:updated', order);
    if (order.paymentStatus === 'paid') {
      this.io.to('kitchen').emit('order:updated', order);
    }
    this.logger.log(`Broadcasted order update #${order.id}`);
  }

  // Broadcast payment update
  broadcastPaymentUpdate(order: Order) {
    if (!this.io) return;
    this.io.to('orders').emit('order:paid', order);
    this.logger.log(`Broadcasted payment update #${order.id}`);
  }

  // Broadcast all orders (for KDS sync)
  broadcastAllOrders(orders: Order[]) {
    if (!this.io) return;
    this.io.to('orders').emit('orders:refresh', orders);
    this.io.to('kitchen').emit('orders:refresh', orders.filter((order) => order.paymentStatus === 'paid'));
  }
}
