import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentMode {
  CASH = 'cash',
  UPI = 'upi',
  BANK_TRANSFER = 'bankTransfer',
}

export type AdvanceDocument = Advance & Document;

@Schema({ timestamps: true, collection: 'advances' })
export class Advance {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Karagar' })
  karagarId: Types.ObjectId;

  @Prop({ required: true })
  karagarName: string;

  // Amount in paise (integer)
  @Prop({ required: true, min: 1 })
  amountPaise: number;

  @Prop({ required: true, enum: PaymentMode })
  paymentMode: PaymentMode;

  @Prop()
  purpose?: string;

  @Prop()
  referenceNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  disbursedBy: Types.ObjectId;

  // Amount repaid so far in paise
  @Prop({ default: 0 })
  repaidPaise: number;

  @Prop({ default: false })
  fullyRepaid: boolean;
}

export const AdvanceSchema = SchemaFactory.createForClass(Advance);
AdvanceSchema.index({ karagarId: 1 });
AdvanceSchema.index({ transactionId: 1 });
AdvanceSchema.index({ fullyRepaid: 1 });
AdvanceSchema.index({ createdAt: -1 });
