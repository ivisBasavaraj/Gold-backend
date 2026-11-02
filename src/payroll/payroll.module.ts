import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { Payroll, PayrollSchema } from './payroll.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payroll.name, schema: PayrollSchema },
      { name: Karagar.name, schema: KaragarSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
