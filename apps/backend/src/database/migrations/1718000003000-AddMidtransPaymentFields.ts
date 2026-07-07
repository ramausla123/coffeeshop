import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMidtransPaymentFields1718000003000 implements MigrationInterface {
  name = 'AddMidtransPaymentFields1718000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(30)`);
    await queryRunner.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "paymentReference" character varying(120)`);
    await queryRunner.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "midtransOrderId" character varying(120)`);
    await queryRunner.query(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "midtransTransactionStatus" character varying(50)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.orders DROP COLUMN IF EXISTS "midtransTransactionStatus"`);
    await queryRunner.query(`ALTER TABLE public.orders DROP COLUMN IF EXISTS "midtransOrderId"`);
    await queryRunner.query(`ALTER TABLE public.orders DROP COLUMN IF EXISTS "paymentReference"`);
    await queryRunner.query(`ALTER TABLE public.orders DROP COLUMN IF EXISTS "paymentMethod"`);
  }
}
