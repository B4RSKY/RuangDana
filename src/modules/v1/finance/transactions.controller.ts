import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateTransactionDto,
  FindTransactionsQueryDto,
  UpdateTransactionDto,
} from './finance.dto';
import { TransactionsService } from './transactions.service';

@Controller('v1/transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  async findAll(@Query() query: FindTransactionsQueryDto) {
    const result = await this.transactions.findAll(query);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Transactions retrieved successfully',
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      statusCode: 200,
      message: 'Transaction retrieved successfully',
      data: await this.transactions.findById(id),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateTransactionDto) {
    return {
      success: true,
      statusCode: 201,
      message: 'Transaction created successfully',
      data: await this.transactions.create(body),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionDto,
  ) {
    return {
      success: true,
      statusCode: 200,
      message: 'Transaction updated successfully',
      data: await this.transactions.update(id, body),
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      statusCode: 200,
      message: 'Transaction deleted successfully',
      data: await this.transactions.remove(id),
    };
  }
}
