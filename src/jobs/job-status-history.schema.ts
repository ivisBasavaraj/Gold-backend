import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { JobStatus } from './job.schema';

export type JobStatusHistoryDocument = JobStatusHistory & Document;

@Schema({ timestamps: true, collection: 'job_status_histories' })
export class JobStatusHistory {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, enum: JobStatus })
  fromStatus: JobStatus;

  @Prop({ required: true, enum: JobStatus })
  toStatus: JobStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  changedBy: Types.ObjectId;

  @Prop()
  notes?: string;
}

export const JobStatusHistorySchema = SchemaFactory.createForClass(JobStatusHistory);
JobStatusHistorySchema.index({ jobId: 1 });
