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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './finance.dto';

@Controller('v1/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  async findAll() {
    return {
      success: true,
      statusCode: 200,
      message: 'Categories retrieved successfully',
      data: await this.categories.findAll(),
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      statusCode: 200,
      message: 'Category retrieved successfully',
      data: await this.categories.findById(id),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateCategoryDto) {
    return {
      success: true,
      statusCode: 201,
      message: 'Category created successfully',
      data: await this.categories.create(body),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ) {
    return {
      success: true,
      statusCode: 200,
      message: 'Category updated successfully',
      data: await this.categories.update(id, body),
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return {
      success: true,
      statusCode: 200,
      message: 'Category deleted successfully',
      data: await this.categories.remove(id),
    };
  }
}
