import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaterialReceiptsController } from './material-receipts.controller';
import { MaterialReceiptsService } from './material-receipts.service';
import { MaterialReceipt, MaterialReceiptSchema } from './material-receipt.schema';
import { Job, JobSchema } from '../jobs/job.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';
import { TreasuryModule } from '../treasury/treasury.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialReceipt.name, schema: MaterialReceiptSchema },
      { name: Job.name, schema: JobSchema },
      { name: Karagar.name, schema: KaragarSchema },
    ]),
    TreasuryModule,
  ],
  controllers: [MaterialReceiptsController],
  providers: [MaterialReceiptsService],
  exports: [MaterialReceiptsService],
})
export class MaterialReceiptsModule {}
