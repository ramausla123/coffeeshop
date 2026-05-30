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

  private async seedDefaultUsers() {
    const hasAdmin = await this.userRepository.exist({ where: { username: 'admin' } });
    if (!hasAdmin) {
      await this.create('admin', 'admin123', 'admin');
      this.logger.log('Created default admin user: admin / admin123');
    }

    const hasKitchen = await this.userRepository.exist({ where: { username: 'kitchen' } });
    if (!hasKitchen) {
      await this.create('kitchen', 'kitchen123', 'kitchen');
      this.logger.log('Created default kitchen user: kitchen / kitchen123');
    }
  }
}
