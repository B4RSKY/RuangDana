import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';
import { Category } from './category.entity';
import { FinanceBaseEntity } from './finance-base.entity';

@Entity({ name: 'transactions' })
export class Transaction extends FinanceBaseEntity {
  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId!: number;

  @ManyToOne(() => Category, (category) => category.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: Category;
}
