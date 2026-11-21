import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../../database/entities/category.entity';
import { Transaction } from '../../../database/entities/transaction.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './finance.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categories.find({ order: { type: 'ASC', name: 'ASC' } });
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  create(input: CreateCategoryDto): Promise<Category> {
    this.validateName(input.name);
    return this.categories.save(this.categories.create(input));
  }

  async update(id: number, input: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);
    if (input.name !== undefined) this.validateName(input.name);
    if (input.type !== undefined && input.type !== category.type) {
      const used = await this.transactions.count({ where: { categoryId: id } });
      if (used > 0) {
        throw new ConflictException(
          'Cannot change the type of a used category',
        );
      }
    }
    return this.categories.save(this.categories.merge(category, input));
  }

  async remove(id: number): Promise<{ id: number; deleted: true }> {
    const category = await this.findById(id);
    const used = await this.transactions.count({ where: { categoryId: id } });
    if (used > 0) {
      throw new ConflictException(
        'Cannot delete a category used by transactions',
      );
    }
    await this.categories.remove(category);
    return { id, deleted: true };
  }

  private validateName(name: unknown): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('name must be a non-empty string');
    }
  }
}
