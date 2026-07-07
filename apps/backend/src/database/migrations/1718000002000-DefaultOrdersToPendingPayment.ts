import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultOrdersToPendingPayment1718000002000 implements MigrationInterface {
  name = 'DefaultOrdersToPendingPayment1718000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.orders ALTER COLUMN "status" SET DEFAULT 'pending_payment'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.orders ALTER COLUMN "status" SET DEFAULT 'received'`);
  }
}
