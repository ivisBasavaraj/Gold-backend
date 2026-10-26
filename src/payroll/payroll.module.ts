import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { Payroll, PayrollSchema } from './payroll.schema';
import { Job, JobSchema } from '../jobs/job.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';
import { Advance, AdvanceSchema } from '../advances/advance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payroll.name, schema: PayrollSchema },
      { name: Job.name, schema: JobSchema },
      { name: Karagar.name, schema: KaragarSchema },
      { name: Advance.name, schema: AdvanceSchema },
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
