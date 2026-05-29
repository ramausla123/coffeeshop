import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuItem } from './entities/menu-item.entity';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu() {
    return this.menuService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    if (!body.name || !body.price) throw new BadRequestException('name and price required');
    return this.menuService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<MenuItem>) {
    const item = await this.menuService.update(Number(id), body);
    if (!item) throw new BadRequestException('Menu item not found');
    return item;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!(await this.menuService.delete(Number(id)))) throw new BadRequestException('Menu item not found');
    return { success: true };
  }
}
