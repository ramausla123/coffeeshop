import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuService } from '../menu/menu.service';
import { PrinterService } from '../printer/printer.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from './order-status';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly menuService: MenuService,
    private readonly printerService: PrinterService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(order: CreateOrderDto) {
    // validate menu items and compute total
    let total = 0;
    for (const it of order.items) {
      const menuItem = await this.menuService.findById(it.menuId);
      if (!menuItem) {
        throw new BadRequestException(`menuId ${it.menuId} not found`);
      }
      if (menuItem.isAvailable === false) {
        throw new BadRequestException(`${menuItem.name} is currently unavailable`);
      }
      total += menuItem.price * it.quantity;
    }

    const newOrder = this.orderRepository.create({
      table: order.table,
      items: order.items as any,
      status: 'pending_payment',
      total,
    });
    const saved = await this.orderRepository.save(newOrder);
    const enriched = await this.enrichOrder(saved);

    // Notify cashier/admin that a new unpaid QR order is waiting.
    this.ordersGateway.broadcastOrderUpdate(enriched);

    return enriched;
  }

  async findById(id: number) {
    const order = await this.orderRepository.findOne({ where: { id } });
    return order ? this.enrichOrder(order) : undefined;
  }

  async list() {
    const orders = await this.orderRepository.find({ order: { id: 'DESC' } });
    return Promise.all(orders.map((o) => this.enrichOrder(o)));
  }

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) return undefined;
    if (order.status === 'canceled') {
      throw new BadRequestException(`Order #${id} has been canceled`);
    }
    order.status = status;
    const updated = await this.orderRepository.save(order);
    const enriched = await this.enrichOrder(updated);

    // Broadcast status update to connected clients
    this.ordersGateway.broadcastOrderUpdate(enriched);

    return enriched;
  }

  async updatePayment(id: number, paidAmount: number) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) return undefined;
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException(`Order #${id} has already been paid`);
    }
    if (order.status === 'canceled') {
      throw new BadRequestException(`Order #${id} has been canceled`);
    }
    if (paidAmount < order.total) {
      throw new BadRequestException(`Paid amount (${paidAmount}) must be >= order total (${order.total})`);
    }
    order.paymentStatus = 'paid';
    if (order.status === 'pending_payment') {
      order.status = 'received';
    }
    order.paidAmount = paidAmount;
    order.paidAt = new Date();
    const updated = await this.orderRepository.save(order);
    const enriched = await this.enrichOrder(updated);

    this.ordersGateway.broadcastPaymentUpdate(enriched);
    if (updated.status === 'received') {
      this.ordersGateway.broadcastNewOrder(enriched);
    }

    // Trigger receipt printing
    const change = paidAmount - order.total;
    this.printerService.printReceipt(enriched, paidAmount, change).catch((err) => {
      console.error(`Failed to print receipt for order ${id}:`, err);
    });

    return enriched;
  }

  async cancel(id: number, reason?: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) return undefined;
    if (order.status === 'canceled') {
      throw new BadRequestException(`Order #${id} has already been canceled`);
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException(`Order #${id} is paid. Use refund instead.`);
    }

    order.status = 'canceled';
    order.canceledAt = new Date();
    order.correctionReason = reason || 'Canceled by staff';
    const updated = await this.orderRepository.save(order);
    const enriched = await this.enrichOrder(updated);
    this.ordersGateway.broadcastOrderUpdate(enriched);
    return enriched;
  }

  async refund(id: number, reason?: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) return undefined;
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException(`Order #${id} has not been paid`);
    }

    order.paymentStatus = 'refunded';
    order.status = 'canceled';
    order.refundedAt = new Date();
    order.correctionReason = reason || 'Refunded by staff';
    const updated = await this.orderRepository.save(order);
    const enriched = await this.enrichOrder(updated);
    this.ordersGateway.broadcastOrderUpdate(enriched);
    return enriched;
  }

  private async enrichOrder(order: Order) {
    const items = await Promise.all(
      order.items.map(async (it: any) => {
        const menuItem = await this.menuService.findById(it.menuId);
        return {
          ...it,
          name: menuItem?.name || 'Unknown',
        };
      }),
    );
    return { ...order, items };
  }
}
