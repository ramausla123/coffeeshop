import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMenuItemCategory1718000004000 implements MigrationInterface {
  name = 'AddMenuItemCategory1718000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS "category" character varying(30) NOT NULL DEFAULT 'minuman'`);
    await queryRunner.query(`UPDATE public.menu_items SET "category" = 'minuman' WHERE "category" IS NULL OR "category" = ''`);
    await queryRunner.query(`UPDATE public.menu_items SET "category" = 'minuman' WHERE "name" IN ('Espresso', 'Americano', 'Cappuccino', 'Cafe Latte')`);
    await queryRunner.query(`
      INSERT INTO public.menu_items ("name", "price", "category", "description", "isAvailable", "createdAt", "updatedAt")
      SELECT 'Nasi Goreng Kampung', 35000, 'makanan', 'Nasi goreng dengan telur, ayam suwir, dan acar', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE "name" = 'Nasi Goreng Kampung')
    `);
    await queryRunner.query(`
      INSERT INTO public.menu_items ("name", "price", "category", "description", "isAvailable", "createdAt", "updatedAt")
      SELECT 'Chicken Katsu Rice', 38000, 'makanan', 'Ayam katsu renyah dengan nasi dan saus pilihan', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE "name" = 'Chicken Katsu Rice')
    `);
    await queryRunner.query(`
      INSERT INTO public.menu_items ("name", "price", "category", "description", "isAvailable", "createdAt", "updatedAt")
      SELECT 'French Fries', 22000, 'snack', 'Kentang goreng renyah dengan saus', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE "name" = 'French Fries')
    `);
    await queryRunner.query(`
      INSERT INTO public.menu_items ("name", "price", "category", "description", "isAvailable", "createdAt", "updatedAt")
      SELECT 'Roti Bakar Coklat Keju', 26000, 'snack', 'Roti bakar dengan coklat dan keju', true, now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM public.menu_items WHERE "name" = 'Roti Bakar Coklat Keju')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.menu_items DROP COLUMN IF EXISTS "category"`);
  }
}
