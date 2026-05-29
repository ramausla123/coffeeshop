import { Body, Controller, Get, Param, Post, Patch, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() body: CreateOrderDto) {
    return this.ordersService.create(body);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const order = await this.ordersService.findById(Number(id));
    return order ?? { error: 'not_found' };
  }

  @Get()
  async list() {
    return this.ordersService.list();
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const valid = ['received', 'preparing', 'ready', 'served'];
    if (!valid.includes(status)) throw new BadRequestException('Invalid status');
    const order = await this.ordersService.updateStatus(Number(id), status as any);
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }
}
