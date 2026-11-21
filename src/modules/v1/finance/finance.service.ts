import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '../../../database/entities/transaction.entity';
import { FindSummaryQueryDto } from './finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  async getSummary(query: FindSummaryQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }
    const builder = this.transactions
      .createQueryBuilder('transaction')
      .select(
        "COALESCE(SUM(CASE WHEN transaction.type = 'income' THEN transaction.amount ELSE 0 END), 0)",
        'income',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN transaction.type = 'expense' THEN transaction.amount ELSE 0 END), 0)",
        'expense',
      );
    builder.addSelect(
      "COALESCE(SUM(CASE WHEN transaction.type = 'income' THEN transaction.amount WHEN transaction.type = 'expense' THEN -transaction.amount ELSE 0 END), 0)",
      'balance',
    );
    this.applyDateFilter(builder, query);
    const totals = await builder.getRawOne<{
      income: string;
      expense: string;
      balance: string;
    }>();
    const income = totals.income ?? '0.00';
    const expense = totals.expense ?? '0.00';
    return {
      income,
      expense,
      balance: totals.balance ?? '0.00',
    };
  }

  private applyDateFilter(
    builder: SelectQueryBuilder<Transaction>,
    query: FindSummaryQueryDto,
  ): void {
    if (query.from) {
      builder.andWhere('transaction.transactionDate >= :from', {
        from: query.from,
      });
    }
    if (query.to) {
      builder.andWhere('transaction.transactionDate <= :to', { to: query.to });
    }
  }
}
