import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus } from '../order-status';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  orderId!: number;

  @Column({ type: 'integer' })
  menuId!: number;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  table?: string;

  @Column('simple-json')
  items!: OrderItem[];

  @Column({ type: 'varchar', length: 50, default: 'received' })
  status!: OrderStatus;

  @Column({ type: 'integer' })
  total!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  paymentStatus!: 'pending' | 'paid' | 'refunded';

  @Column({ type: 'varchar', length: 30, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  paymentReference?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  midtransOrderId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  midtransTransactionStatus?: string;

  @Column({ type: 'integer', nullable: true })
  paidAmount?: number;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @Column({ type: 'text', nullable: true })
  correctionReason?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
