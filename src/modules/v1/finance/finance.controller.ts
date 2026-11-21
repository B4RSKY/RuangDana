import { Controller, Get, Query } from '@nestjs/common';
import { FindSummaryQueryDto } from './finance.dto';
import { FinanceService } from './finance.service';

@Controller('v1/summary')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  async getSummary(@Query() query: FindSummaryQueryDto) {
    return {
      success: true,
      statusCode: 200,
      message: 'Financial summary retrieved successfully',
      data: await this.finance.getSummary(query),
    };
  }
}
