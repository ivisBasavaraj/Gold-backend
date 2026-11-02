import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

  @Prop({ default: 0 })
  paidPaise: number;

  @Prop()
  notes?: string;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);
PayrollSchema.index({ karagarId: 1 });
PayrollSchema.index({ periodStart: 1, periodEnd: 1 });
