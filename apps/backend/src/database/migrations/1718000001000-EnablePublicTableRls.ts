import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePublicTableRls1718000001000 implements MigrationInterface {
  name = 'EnablePublicTableRls1718000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY');

    await queryRunner.query('REVOKE ALL ON TABLE public.menu_items FROM anon, authenticated');
    await queryRunner.query('REVOKE ALL ON TABLE public.orders FROM anon, authenticated');
    await queryRunner.query('REVOKE ALL ON TABLE public."user" FROM anon, authenticated');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE public."user" DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY');
    await queryRunner.query('ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY');
  }
}
