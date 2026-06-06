import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';

export type MenuItemType = {
  id: number;
  name: string;
  price: number;
  description?: string;
  isAvailable: boolean;
};

@Injectable()
export class MenuService implements OnModuleInit {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    @InjectRepository(MenuItem)
    private readonly menuRepository: Repository<MenuItem>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultMenu();
  }

  async findAll(): Promise<MenuItem[]> {
    return this.menuRepository.find({ order: { id: 'ASC' } });
  }

  async findById(id: number): Promise<MenuItem | null> {
    return this.menuRepository.findOne({ where: { id } });
  }

  async create(data: Pick<MenuItem, 'name' | 'price'> & Partial<Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MenuItem> {
    const item = this.menuRepository.create(data);
    return this.menuRepository.save(item);
  }

  async update(id: number, data: Partial<MenuItem>): Promise<MenuItem | null> {
    await this.menuRepository.update(id, data);
    return this.menuRepository.findOne({ where: { id } });
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.menuRepository.delete(id);
    return result.affected! > 0;
  }

  private async seedDefaultMenu() {
    const count = await this.menuRepository.count();
    if (count > 0) return;

    await this.menuRepository.save([
      {
        name: 'Espresso',
        price: 20000,
        description: 'Single shot coffee',
        isAvailable: true,
      },
      {
        name: 'Americano',
        price: 24000,
        description: 'Espresso with hot water',
        isAvailable: true,
      },
      {
        name: 'Cappuccino',
        price: 28000,
        description: 'Espresso, steamed milk, and foam',
        isAvailable: true,
      },
      {
        name: 'Cafe Latte',
        price: 30000,
        description: 'Espresso with steamed milk',
        isAvailable: true,
      },
    ]);

    this.logger.log('Created default menu items');
  }
}
