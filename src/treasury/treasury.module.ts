import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { TreasuryTransaction, TreasuryTransactionSchema } from './treasury-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TreasuryTransaction.name, schema: TreasuryTransactionSchema },
    ]),
  ],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService],
})
export class TreasuryModule {}
