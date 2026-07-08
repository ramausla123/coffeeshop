import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';

export type MenuItemType = {
  id: number;
  name: string;
  price: number;
  category: 'makanan' | 'minuman' | 'snack';
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
    return this.menuRepository.find({ order: { category: 'ASC', id: 'ASC' } });
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
    const defaultItems: Array<Pick<MenuItem, 'name' | 'price' | 'category' | 'description' | 'isAvailable'>> = [
      {
        name: 'Espresso',
        price: 20000,
        category: 'minuman',
        description: 'Single shot coffee',
        isAvailable: true,
      },
      {
        name: 'Americano',
        price: 24000,
        category: 'minuman',
        description: 'Espresso with hot water',
        isAvailable: true,
      },
      {
        name: 'Cappuccino',
        price: 28000,
        category: 'minuman',
        description: 'Espresso, steamed milk, and foam',
        isAvailable: true,
      },
      {
        name: 'Cafe Latte',
        price: 30000,
        category: 'minuman',
        description: 'Espresso with steamed milk',
        isAvailable: true,
      },
      {
        name: 'Nasi Goreng Kampung',
        price: 35000,
        category: 'makanan',
        description: 'Nasi goreng dengan telur, ayam suwir, dan acar',
        isAvailable: true,
      },
      {
        name: 'Chicken Katsu Rice',
        price: 38000,
        category: 'makanan',
        description: 'Ayam katsu renyah dengan nasi dan saus pilihan',
        isAvailable: true,
      },
      {
        name: 'French Fries',
        price: 22000,
        category: 'snack',
        description: 'Kentang goreng renyah dengan saus',
        isAvailable: true,
      },
      {
        name: 'Roti Bakar Coklat Keju',
        price: 26000,
        category: 'snack',
        description: 'Roti bakar dengan coklat dan keju',
        isAvailable: true,
      },
    ];

    let createdCount = 0;
    for (const item of defaultItems) {
      const exists = await this.menuRepository.exist({ where: { name: item.name } });
      if (exists) {
        await this.menuRepository.update({ name: item.name }, { category: item.category });
        continue;
      }
      await this.menuRepository.save(item);
      createdCount += 1;
    }

    if (createdCount > 0) {
      this.logger.log(`Created ${createdCount} default menu items`);
    }
  }
}
