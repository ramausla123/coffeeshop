import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  orderId: number;

  @Column({ type: 'integer' })
  menuId: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  table?: string;

  @Column('simple-json')
  items: OrderItem[];

  @Column({ type: 'varchar', length: 50, default: 'received' })
  status: 'received' | 'preparing' | 'ready' | 'served';

  @Column({ type: 'integer' })
  total: number;

  @Column({ type: 'varchar', length: 50, default: 'unpaid' })
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed';

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentToken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
