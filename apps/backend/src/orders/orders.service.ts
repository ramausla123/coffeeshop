import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuService } from '../menu/menu.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from './order-status';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly menuService: MenuService,
  ) {}

  async create(order: CreateOrderDto) {
    // validate menu items and compute total
    let total = 0;
    for (const it of order.items) {
      const menuItem = await this.menuService.findById(it.menuId);
      if (!menuItem) {
        throw new BadRequestException(`menuId ${it.menuId} not found`);
      }
      total += menuItem.price * it.quantity;
    }

    const newOrder = this.orderRepository.create({
      table: order.table,
      items: order.items as any,
      status: 'received',
      total,
    });
    const saved = await this.orderRepository.save(newOrder);
    return this.enrichOrder(saved);
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
    order.status = status;
    const updated = await this.orderRepository.save(order);
    return this.enrichOrder(updated);
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
