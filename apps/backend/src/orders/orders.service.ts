import { Injectable, BadRequestException } from '@nestjs/common';
import { MenuService } from '../menu/menu.service';
import { CreateOrderDto } from './dto/create-order.dto';

export type OrderItem = {
  menuId: number;
  quantity: number;
  note?: string;
};

export type Order = {
  id: number;
  table?: string;
  items: OrderItem[];
  status: 'received' | 'preparing' | 'ready' | 'served';
  total: number;
};

@Injectable()
export class OrdersService {
  private orders: Order[] = [];
  private nextId = 1;

  constructor(private readonly menuService: MenuService) {}

  create(order: CreateOrderDto) {
    // validate menu items and compute total
    let total = 0;
    for (const it of order.items) {
      const menuItem = this.menuService.findById(it.menuId);
      if (!menuItem) {
        throw new BadRequestException(`menuId ${it.menuId} not found`);
      }
      total += menuItem.price * it.quantity;
    }

    const id = this.nextId++;
    const newOrder: Order = {
      id,
      table: order.table,
      items: order.items as OrderItem[],
      status: 'received',
      total,
    };
    this.orders.push(newOrder);
    return this.enrichOrder(newOrder);
  }

  private enrichOrder(order: Order) {
    return {
      ...order,
      items: order.items.map((it) => ({
        ...it,
        name: this.menuService.findById(it.menuId)?.name || 'Unknown',
      })),
    };
  }

  findById(id: number) {
    const order = this.orders.find((o) => o.id === id);
    return order ? this.enrichOrder(order) : undefined;
  }

  list() {
    return this.orders.map((o) => this.enrichOrder(o));
  }
  updateStatus(id: number, status: Order['status']) {
    const order = this.orders.find((o) => o.id === id);
    if (!order) return undefined;
    order.status = status;
    return this.enrichOrder(order);
  }
}
