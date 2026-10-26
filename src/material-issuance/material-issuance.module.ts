import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaterialIssuanceController } from './material-issuance.controller';
import { MaterialIssuanceService } from './material-issuance.service';
import { MaterialIssuance, MaterialIssuanceSchema } from './material-issuance.schema';
import { Job, JobSchema } from '../jobs/job.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';
import { TreasuryModule } from '../treasury/treasury.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialIssuance.name, schema: MaterialIssuanceSchema },
      { name: Job.name, schema: JobSchema },
      { name: Karagar.name, schema: KaragarSchema },
    ]),
    TreasuryModule,
  ],
  controllers: [MaterialIssuanceController],
  providers: [MaterialIssuanceService],
  exports: [MaterialIssuanceService],
})
export class MaterialIssuanceModule {}
