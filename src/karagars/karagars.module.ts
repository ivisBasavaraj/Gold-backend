import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KaragarsController } from './karagars.controller';
import { KaragarsService } from './karagars.service';
import { Karagar, KaragarSchema } from './karagar.schema';
import { MaterialIssuance, MaterialIssuanceSchema } from '../material-issuance/material-issuance.schema';
import { MaterialReceipt, MaterialReceiptSchema } from '../material-receipts/material-receipt.schema';
import { Job, JobSchema } from '../jobs/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Karagar.name, schema: KaragarSchema },
      { name: MaterialIssuance.name, schema: MaterialIssuanceSchema },
      { name: MaterialReceipt.name, schema: MaterialReceiptSchema },
      { name: Job.name, schema: JobSchema },
    ]),
  ],
  controllers: [KaragarsController],
  providers: [KaragarsService],
  exports: [KaragarsService],
})
export class KaragarsModule {}
