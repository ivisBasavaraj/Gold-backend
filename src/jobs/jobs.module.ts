import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job, JobSchema } from './job.schema';
import { JobStatusHistory, JobStatusHistorySchema } from './job-status-history.schema';
import { Karagar, KaragarSchema } from '../karagars/karagar.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: JobStatusHistory.name, schema: JobStatusHistorySchema },
      { name: Karagar.name, schema: KaragarSchema },
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
