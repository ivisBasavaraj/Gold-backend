import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PayrollStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'underReview',
  APPROVED = 'approved',
  PARTIALLY_PAID = 'partiallyPaid',
  PAID = 'paid',
}

export enum WastageStatus {
  WITHIN_ALLOWANCE = 'withinAllowance',
  BELOW_ALLOWANCE = 'belowAllowance',
  ABOVE_ALLOWANCE = 'aboveAllowance',
  INCENTIVE_APPROVED = 'incentiveApproved',
  PENALTY_APPROVED = 'penaltyApproved',
  PENDING_RECONCILIATION = 'pendingReconciliation',
}

export type PayrollDocument = Payroll & Document;

@Schema({ timestamps: true, collection: 'payrolls' })
export class Payroll {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Karagar' })
  karagarId: Types.ObjectId;

  @Prop({ required: true })
  karagarName: string;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ required: true, min: 0 })
  jobsDone: number;

  // All amounts in paise
  @Prop({ required: true, min: 0 })
  grossLaborPaise: number;

  @Prop({ default: 0 })
  approvedIncentivePaise: number;

  @Prop({ default: 0 })
  approvedPenaltyPaise: number;

  @Prop({ default: 0 })
  advanceDeductionPaise: number;

  @Prop({ default: 0 })
  authorizedAdjustmentPaise: number;

  @Prop({ required: true })
  netPayablePaise: number;

  @Prop({ default: 0 })
  paidPaise: number;

  @Prop({ required: true, enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Prop({ required: true, enum: WastageStatus, default: WastageStatus.WITHIN_ALLOWANCE })
  wastageStatus: WastageStatus;

  // Wastage in milligrams
  @Prop({ default: 0 })
  actualWastageMg: number;

  @Prop({ default: 0 })
  allowedWastageMg: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Job' }], default: [] })
  includedJobIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop()
  notes?: string;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);
PayrollSchema.index({ karagarId: 1 });
PayrollSchema.index({ status: 1 });
PayrollSchema.index({ periodStart: 1, periodEnd: 1 });
