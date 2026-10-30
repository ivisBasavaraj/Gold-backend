import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReceiptType {
  FINISHED_PRODUCT = 'finishedProduct',
  RECOVERED_MATERIAL = 'recoveredMaterial',
  PARTIAL_RETURN = 'partialReturn',
  AUTHORIZED_RETURN = 'authorizedReturn',
}

export type MaterialReceiptDocument = MaterialReceipt & Document;

@Schema({ timestamps: true, collection: 'material_receipts' })
export class MaterialReceipt {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Karagar' })
  karagarId: Types.ObjectId;

  @Prop({ required: true })
  karagarName: string;

  @Prop({ required: true, enum: ReceiptType })
  receiptType: ReceiptType;

  @Prop({ required: true, min: 1 })
  physicalWeightMg: number;

  @Prop({ default: 1.0, min: 0, max: 1 })
  purity: number;

  @Prop({ default: 0 })
  pureGoldEquivalentMg: number;

  @Prop({ default: '' })
  meltingGroup: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorizedBy: Types.ObjectId;

  @Prop()
  scaleImageUrl?: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  reversed: boolean;
}

export const MaterialReceiptSchema = SchemaFactory.createForClass(MaterialReceipt);
MaterialReceiptSchema.index({ jobId: 1 });
MaterialReceiptSchema.index({ karagarId: 1 });
MaterialReceiptSchema.index({ transactionId: 1 });
MaterialReceiptSchema.index({ createdAt: -1 });
