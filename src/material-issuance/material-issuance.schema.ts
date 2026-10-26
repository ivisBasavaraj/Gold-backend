import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaterialIssuanceDocument = MaterialIssuance & Document;

@Schema({ timestamps: true, collection: 'material_issuances' })
export class MaterialIssuance {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
  jobId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Karagar' })
  karagarId: Types.ObjectId;

  @Prop({ required: true })
  karagarName: string;

  // Physical weight in milligrams
  @Prop({ required: true, min: 1 })
  physicalWeightMg: number;

  // Purity as decimal e.g. 0.916
  @Prop({ required: true, min: 0, max: 1 })
  purity: number;

  // Pure gold equivalent = physicalWeightMg * purity
  @Prop({ required: true })
  pureGoldEquivalentMg: number;

  @Prop({ required: true })
  meltingGroup: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorizedBy: Types.ObjectId;

  @Prop()
  scaleImageUrl?: string;

  @Prop()
  ocrExtractedWeightMg?: number;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  reversed: boolean;

  @Prop()
  reversalReason?: string;
}

export const MaterialIssuanceSchema = SchemaFactory.createForClass(MaterialIssuance);
MaterialIssuanceSchema.index({ jobId: 1 });
MaterialIssuanceSchema.index({ karagarId: 1 });
MaterialIssuanceSchema.index({ transactionId: 1 });
MaterialIssuanceSchema.index({ createdAt: -1 });
