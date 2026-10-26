import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum JobStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'inProgress',
  QUALITY_CHECK = 'qualityCheck',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export type JobDocument = Job & Document;

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ required: true, unique: true })
  jobNumber: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  jewelryCategory: string;

  @Prop({ required: true, min: 1 })
  pieceCount: number;

  // Stored in milligrams (integer) — display as grams (÷1000)
  @Prop({ required: true, min: 1 })
  requiredWeightMg: number;

  // Purity as decimal e.g. 0.916 for 22K
  @Prop({ required: true, min: 0, max: 1 })
  purity: number;

  @Prop({ required: true })
  meltingGroup: string;

  // Labor rate in paise (integer) — display as rupees (÷100)
  @Prop({ required: true, min: 0 })
  laborRatePerPiecePaise: number;

  // Wastage allowance in milligrams
  @Prop({ required: true, min: 0, default: 0 })
  wastageAllowanceMg: number;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: true, enum: JobStatus, default: JobStatus.ASSIGNED })
  status: JobStatus;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Karagar' })
  karagarId: Types.ObjectId;

  @Prop({ required: true })
  karagarName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  @Prop()
  notes?: string;

  // Denormalized running totals (updated atomically on each issuance/receipt)
  @Prop({ default: 0 })
  totalIssuedMg: number;

  @Prop({ default: 0 })
  totalReturnedMg: number;
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ jobNumber: 1 });
JobSchema.index({ karagarId: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ dueDate: 1 });
JobSchema.index({ meltingGroup: 1 });
