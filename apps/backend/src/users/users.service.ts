import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultUsers();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(username: string, password: string, role: UserRole): Promise<User> {
    const hashed = await bcrypt.hash(password, 8);
    const user = this.userRepository.create({ username, password: hashed, role });
    return this.userRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async updatePassword(id: number, password: string): Promise<void> {
    const hashed = await bcrypt.hash(password, 8);
    await this.userRepository.update(id, { password: hashed });
  }

  private async seedDefaultUsers() {
    const defaults = this.getDefaultUsers();

    const hasAdmin = await this.userRepository.exist({ where: { username: 'admin' } });
    if (!hasAdmin) {
      await this.create('admin', defaults.admin, 'admin');
      this.logger.log('Created default admin user');
    }

    const hasKitchen = await this.userRepository.exist({ where: { username: 'kitchen' } });
    if (!hasKitchen) {
      await this.create('kitchen', defaults.kitchen, 'kitchen');
      this.logger.log('Created default kitchen user');
    }

    const hasCashier = await this.userRepository.exist({ where: { username: 'cashier' } });
    if (!hasCashier) {
      await this.create('cashier', defaults.cashier, 'cashier');
      this.logger.log('Created default cashier user');
    }
  }

  private getDefaultUsers() {
    const defaults = {
      admin: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      kitchen: process.env.DEFAULT_KITCHEN_PASSWORD || 'kitchen123',
      cashier: process.env.DEFAULT_CASHIER_PASSWORD || 'cashier123',
    };

    if (process.env.NODE_ENV === 'production') {
      const unsafe =
        defaults.admin === 'admin123' ||
        defaults.kitchen === 'kitchen123' ||
        defaults.cashier === 'cashier123';

      if (unsafe) {
        throw new Error('Set DEFAULT_ADMIN_PASSWORD, DEFAULT_KITCHEN_PASSWORD, and DEFAULT_CASHIER_PASSWORD in production');
      }
    }

    return defaults;
  }
}
