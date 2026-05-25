import { Injectable } from '@nestjs/common';

export type MenuItem = {
  id: number;
  name: string;
  price: number;
  description?: string;
};

@Injectable()
export class MenuService {
  private menu: MenuItem[] = [
    { id: 1, name: 'Espresso', price: 20000, description: 'Single shot' },
    { id: 2, name: 'Cappuccino', price: 28000, description: 'Milk foam' },
    { id: 3, name: 'Latte', price: 30000, description: 'Smooth milk' },
    { id: 4, name: 'Croissant', price: 25000, description: 'Buttery pastry' },
  ];

  findAll(): MenuItem[] {
    return this.menu;
  }

  findById(id: number): MenuItem | undefined {
    return this.menu.find((m) => m.id === id);
  }

  create(data: Omit<MenuItem, 'id'>): MenuItem {
    const id = Math.max(...this.menu.map((m) => m.id), 0) + 1;
    const newItem: MenuItem = { id, ...data };
    this.menu.push(newItem);
    return newItem;
  }

  update(id: number, data: Partial<MenuItem>): MenuItem | undefined {
    const item = this.menu.find((m) => m.id === id);
    if (!item) return undefined;
    Object.assign(item, data);
    return item;
  }

  delete(id: number): boolean {
    const idx = this.menu.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.menu.splice(idx, 1);
    return true;
  }
}
