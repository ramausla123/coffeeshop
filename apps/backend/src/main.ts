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

  const port = Number(process.env.PORT || 4000);

  // Attach Socket.io to the same HTTP server. Most deployment platforms expose
  // one port per service, so HTTP and realtime traffic should share it.
  const ordersGateway = app.get(OrdersGateway);
  const server = new Server(app.getHttpServer(), {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  ordersGateway.setServer(server);

  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`WebSocket server attached to http://localhost:${port}`);
}

bootstrap();
