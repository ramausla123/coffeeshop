import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { MenuService, MenuItem } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  getMenu() {
    return this.menuService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    if (!body.name || !body.price) throw new BadRequestException('name and price required');
    return this.menuService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<MenuItem>) {
    const item = this.menuService.update(Number(id), body);
    if (!item) throw new BadRequestException('Menu item not found');
    return item;
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    if (!this.menuService.delete(Number(id))) throw new BadRequestException('Menu item not found');
    return { success: true };
  }
}
