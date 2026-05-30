import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuItem } from './entities/menu-item.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu() {
    return this.menuService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() body: any) {
    if (!body.name || !body.price) throw new BadRequestException('name and price required');
    return this.menuService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<MenuItem>) {
    const item = await this.menuService.update(Number(id), body);
    if (!item) throw new BadRequestException('Menu item not found');
    return item;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!(await this.menuService.delete(Number(id)))) throw new BadRequestException('Menu item not found');
    return { success: true };
  }
}
