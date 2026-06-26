import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCoffeeSchema1718000000000 implements MigrationInterface {
  name = 'InitialCoffeeSchema1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_items" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "price" integer NOT NULL,
        "description" text,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" SERIAL NOT NULL,
        "table" character varying(50),
        "items" text NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'received',
        "total" integer NOT NULL,
        "paymentStatus" character varying(20) NOT NULL DEFAULT 'pending',
        "paidAmount" integer,
        "paidAt" TIMESTAMP,
        "canceledAt" TIMESTAMP,
        "refundedAt" TIMESTAMP,
        "correctionReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" SERIAL NOT NULL,
        "username" character varying(100) NOT NULL,
        "password" character varying(100) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'cashier',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_username" ON "user" ("username")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_user_username"');
    await queryRunner.query('DROP TABLE IF EXISTS "user"');
    await queryRunner.query('DROP TABLE IF EXISTS "orders"');
    await queryRunner.query('DROP TABLE IF EXISTS "menu_items"');
  }
}
