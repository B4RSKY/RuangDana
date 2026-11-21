import { Column, Entity, OneToMany } from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';
import { Transaction } from './transaction.entity';
import { FinanceBaseEntity } from './finance-base.entity';

@Entity({ name: 'categories' })
export class Category extends FinanceBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions!: Transaction[];
}
