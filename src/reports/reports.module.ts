import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Job, JobSchema } from '../jobs/job.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';
import { MaterialIssuance, MaterialIssuanceSchema } from '../material-issuance/material-issuance.schema';
import { MaterialReceipt, MaterialReceiptSchema } from '../material-receipts/material-receipt.schema';
import { Advance, AdvanceSchema } from '../advances/advance.schema';
import { Payroll, PayrollSchema } from '../payroll/payroll.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Karagar.name, schema: KaragarSchema },
      { name: MaterialIssuance.name, schema: MaterialIssuanceSchema },
      { name: MaterialReceipt.name, schema: MaterialReceiptSchema },
      { name: Advance.name, schema: AdvanceSchema },
      { name: Payroll.name, schema: PayrollSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
