import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Category } from '../../../database/entities/category.entity';
import { Transaction } from '../../../database/entities/transaction.entity';
import { TransactionType } from '../../../database/enums/transaction-type.enum';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepository: jest.Mocked<Partial<Repository<Transaction>>>;
  let categoryRepository: jest.Mocked<Partial<Repository<Category>>>;

  beforeEach(() => {
    transactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    categoryRepository = {
      findOne: jest.fn(),
    };
    service = new TransactionsService(
      transactionRepository as Repository<Transaction>,
      categoryRepository as Repository<Category>,
    );
  });

  it('rejects a transaction when its type differs from the category type', async () => {
    categoryRepository.findOne!.mockResolvedValue({
      id: 1,
      name: 'Salary',
      type: TransactionType.INCOME,
    } as Category);

    await expect(
      service.create({
        title: 'Lunch',
        amount: 25_000,
        type: TransactionType.EXPENSE,
        transactionDate: '2026-11-21',
        categoryId: 1,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(transactionRepository.create).not.toHaveBeenCalled();
  });
});
