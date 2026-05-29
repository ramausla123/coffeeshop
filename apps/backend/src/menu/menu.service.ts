import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';

export type MenuItemType = {
  id: number;
  name: string;
  price: number;
  description?: string;
};

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuRepository: Repository<MenuItem>,
  ) {}

  async findAll(): Promise<MenuItem[]> {
    return this.menuRepository.find({ order: { id: 'ASC' } });
  }

  async findById(id: number): Promise<MenuItem | null> {
    return this.menuRepository.findOne({ where: { id } });
  }

  async create(data: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MenuItem> {
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
}
