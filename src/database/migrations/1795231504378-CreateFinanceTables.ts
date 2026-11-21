import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceTables1795231504378 implements MigrationInterface {
  name = 'CreateFinanceTables1795231504378';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `categories` (`id` int NOT NULL AUTO_INCREMENT, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `name` varchar(100) NOT NULL, `type` enum ('income', 'expense') NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `transactions` (`id` int NOT NULL AUTO_INCREMENT, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `title` varchar(150) NOT NULL, `amount` decimal(12,2) NOT NULL, `type` enum ('income', 'expense') NOT NULL, `description` text NULL, `transaction_date` date NOT NULL, `category_id` int NOT NULL, INDEX `IDX_transactions_transaction_date` (`transaction_date`), INDEX `IDX_transactions_type` (`type`), INDEX `IDX_transactions_category_id` (`category_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_transactions_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE NO ACTION) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `transactions`');
    await queryRunner.query('DROP TABLE `categories`');
  }
}
