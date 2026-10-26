import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvancesController } from './advances.controller';
import { AdvancesService } from './advances.service';
import { Advance, AdvanceSchema } from './advance.schema';
import { AdvanceRepayment, AdvanceRepaymentSchema } from './advance-repayment.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advance.name, schema: AdvanceSchema },
      { name: AdvanceRepayment.name, schema: AdvanceRepaymentSchema },
      { name: Karagar.name, schema: KaragarSchema },
    ]),
  ],
  controllers: [AdvancesController],
  providers: [AdvancesService],
  exports: [AdvancesService],
})
export class AdvancesModule {}
