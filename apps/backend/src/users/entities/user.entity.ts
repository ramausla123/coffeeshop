import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type UserRole = 'admin' | 'kitchen' | 'cashier';

@Entity()
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  username!: string;

  @Column({ length: 100 })
  password!: string;

  @Column({ type: 'varchar', length: 20, default: 'cashier' })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
