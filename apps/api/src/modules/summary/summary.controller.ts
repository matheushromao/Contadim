import {
  type MonthlySummary,
  type MonthlySummaryQuery,
  monthlySummaryQuerySchema,
  monthlySummarySchema,
} from '@contadim/contracts';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type AuthUser, CurrentUser } from '../../common/auth/auth.decorators.js';
import {
  ApiErrorResponses,
  ApiZodQuery,
  ApiZodResponse,
} from '../../common/openapi/zod-openapi.js';
import { ZodQuery } from '../../common/pipes/params.js';
import { SummaryService } from './summary.service.js';

@ApiTags('summary')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('summary')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get('monthly')
  @ApiOperation({
    summary: 'Resumo do mês: receitas, despesas, saldo e gastos por categoria',
  })
  @ApiZodQuery(monthlySummaryQuerySchema)
  @ApiZodResponse(200, monthlySummarySchema)
  @ApiErrorResponses(400)
  monthly(
    @CurrentUser() user: AuthUser,
    @ZodQuery(monthlySummaryQuerySchema) query: MonthlySummaryQuery,
  ): Promise<MonthlySummary> {
    return this.summary.monthly(user.id, query.month);
  }
}
