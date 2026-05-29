import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [DatabaseModule, MenuModule, OrdersModule, PaymentModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
