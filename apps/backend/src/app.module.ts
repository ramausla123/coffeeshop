import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [MenuModule, OrdersModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
