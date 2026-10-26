import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TreasuryTxType {
  OPENING_BALANCE = 'openingBalance',
  ISSUANCE = 'issuance',
  RECEIPT = 'receipt',
  ADJUSTMENT = 'adjustment',
}

export type TreasuryTransactionDocument = TreasuryTransaction & Document;

@Schema({ timestamps: true, collection: 'treasury_transactions' })
export class TreasuryTransaction {
  @Prop({ required: true, enum: TreasuryTxType })
  type: TreasuryTxType;

  // Positive = gold added to vault, Negative = gold removed
  @Prop({ required: true })
  amountMg: number;

  @Prop({ required: true })
  balanceAfterMg: number;

  @Prop({ type: Types.ObjectId, ref: 'MaterialIssuance' })
  issuanceRef?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MaterialReceipt' })
  receiptRef?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorizedBy: Types.ObjectId;

  @Prop({ required: true })
  description: string;
}

export const TreasuryTransactionSchema = SchemaFactory.createForClass(TreasuryTransaction);
TreasuryTransactionSchema.index({ createdAt: -1 });
TreasuryTransactionSchema.index({ type: 1 });
