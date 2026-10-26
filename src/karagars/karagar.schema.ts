import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KaragarDocument = Karagar & Document;

@Schema({ timestamps: true, collection: 'karagars' })
export class Karagar {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  employeeCode: string;

  @Prop({ required: true, trim: true })
  meltingGroup: string;

  @Prop({ required: true, trim: true })
  specialization: string;

  @Prop()
  phone?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  // Linked user account (optional — karagar may not have app login)
  @Prop({ type: Types.ObjectId, ref: 'User', sparse: true })
  userId?: Types.ObjectId;

  @Prop()
  address?: string;

  @Prop()
  notes?: string;
}

export const KaragarSchema = SchemaFactory.createForClass(Karagar);
KaragarSchema.index({ employeeCode: 1 });
KaragarSchema.index({ meltingGroup: 1 });
KaragarSchema.index({ isActive: 1 });
KaragarSchema.index({ name: 'text' });
