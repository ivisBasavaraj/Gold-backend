import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentMode } from './advance.schema';

export type AdvanceRepaymentDocument = AdvanceRepayment & Document;

@Schema({ timestamps: true, collection: 'advance_repayments' })
export class AdvanceRepayment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Advance' })
  advanceId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Karagar' })
  karagarId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amountPaise: number;

  @Prop({ required: true, enum: PaymentMode })
  paymentMode: PaymentMode;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;
}

export const AdvanceRepaymentSchema = SchemaFactory.createForClass(AdvanceRepayment);
AdvanceRepaymentSchema.index({ advanceId: 1 });
AdvanceRepaymentSchema.index({ karagarId: 1 });
