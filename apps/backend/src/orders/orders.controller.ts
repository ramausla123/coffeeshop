import { Body, Controller, Get, Param, Post, Patch, UsePipes, ValidationPipe, BadRequestException, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { isOrderStatus } from './order-status';
import { UpdatePaymentDto } from './dto/update-payment.dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'kitchen', 'cashier')
  @Get()
  async list() {
    return this.ordersService.list();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'kitchen')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    if (!isOrderStatus(status)) throw new BadRequestException('Invalid status');
    const order = await this.ordersService.updateStatus(Number(id), status);
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'cashier')
  @Patch(':id/payment')
  async updatePayment(@Param('id') id: string, @Body() body: UpdatePaymentDto) {
    const order = await this.ordersService.updatePayment(Number(id), body.paidAmount);
    if (!order) throw new BadRequestException('Order not found');
    return order;
  }
}
