import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Category } from '../../../database/entities/category.entity';
import { Transaction } from '../../../database/entities/transaction.entity';
import {
  CreateTransactionDto,
  FindTransactionsQueryDto,
  UpdateTransactionDto,
} from './finance.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async findAll(query: FindTransactionsQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }
    const builder = this.applyFilters(
      this.transactions
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.category', 'category'),
      query,
    );
    const [items, totalItems] = await builder
      .orderBy('transaction.transactionDate', 'DESC')
      .addOrderBy('transaction.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    const totalPages = Math.ceil(totalItems / query.limit);
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async findById(id: number): Promise<Transaction> {
    const transaction = await this.transactions.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!transaction)
      throw new NotFoundException(`Transaction ${id} not found`);
    return transaction;
  }

  async create(input: CreateTransactionDto): Promise<Transaction> {
    await this.validateCategory(input.categoryId, input.type);
    const transaction = this.transactions.create({
      ...input,
      amount: input.amount.toFixed(2),
      description: input.description ?? null,
    });
    return this.transactions.save(transaction);
  }

  async update(id: number, input: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.findById(id);
    const type = input.type ?? transaction.type;
    const categoryId = input.categoryId ?? transaction.categoryId;
    if (input.type !== undefined || input.categoryId !== undefined) {
      await this.validateCategory(categoryId, type);
    }
    const updated = this.transactions.merge(transaction, {
      ...input,
      amount: input.amount === undefined ? undefined : input.amount.toFixed(2),
      categoryId,
      type,
    });
    return this.transactions.save(updated);
  }

  async remove(id: number): Promise<{ id: number; deleted: true }> {
    const transaction = await this.findById(id);
    await this.transactions.remove(transaction);
    return { id, deleted: true };
  }

  private async validateCategory(id: number, type: string): Promise<void> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    if (category.type !== type) {
      throw new BadRequestException(
        'Transaction type must match category type',
      );
    }
  }

  private applyFilters(
    builder: SelectQueryBuilder<Transaction>,
    query: FindTransactionsQueryDto,
  ): SelectQueryBuilder<Transaction> {
    if (query.type)
      builder.andWhere('transaction.type = :type', { type: query.type });
    if (query.categoryId) {
      builder.andWhere('transaction.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.from) {
      builder.andWhere('transaction.transactionDate >= :from', {
        from: query.from,
      });
    }
    if (query.to) {
      builder.andWhere('transaction.transactionDate <= :to', { to: query.to });
    }
    if (query.search) {
      builder.andWhere(
        '(transaction.title LIKE :search OR transaction.description LIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    return builder;
  }
}
