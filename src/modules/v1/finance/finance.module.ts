import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database';
import { CategoriesController } from './categories.controller';
import { FinanceController } from './finance.controller';
import { TransactionsController } from './transactions.controller';
import { CategoriesService } from './categories.service';
import { FinanceService } from './finance.service';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CategoriesController,
    TransactionsController,
    FinanceController,
  ],
  providers: [CategoriesService, TransactionsService, FinanceService],
})
export class FinanceModule {}
