import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { OrdersGateway } from './orders/orders.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Setup socket.io server
  const ordersGateway = app.get(OrdersGateway);
  const wsPort = Number(process.env.WS_PORT || 4002);
  const server = new Server(wsPort, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  ordersGateway.setServer(server);

  await app.listen(4000);
  console.log('Backend running on http://localhost:4000');
  console.log(`WebSocket server running on ws://localhost:${wsPort}`);
}

bootstrap();
