import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  TreasuryTransaction,
  TreasuryTransactionDocument,
  TreasuryTxType,
} from './treasury-transaction.schema';

@Injectable()
export class TreasuryService implements OnModuleInit {
  constructor(
    @InjectModel(TreasuryTransaction.name)
    private txModel: Model<TreasuryTransactionDocument>,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedOpeningBalance();
  }

  async getSummary() {
    const agg = await this.txModel.aggregate([
      {
        $group: {
          _id: null,
          openingReserveMg: {
            $sum: {
              $cond: [{ $eq: ['$type', TreasuryTxType.OPENING_BALANCE] }, '$amountMg', 0],
            },
          },
          totalIssuedMg: {
            $sum: {
              $cond: [{ $eq: ['$type', TreasuryTxType.ISSUANCE] }, { $abs: '$amountMg' }, 0],
            },
          },
          totalReturnedMg: {
            $sum: {
              $cond: [{ $eq: ['$type', TreasuryTxType.RECEIPT] }, '$amountMg', 0],
            },
          },
        },
      },
    ]);

    const latest = await this.txModel.findOne().sort({ createdAt: -1 }).lean();
    const currentBalanceMg: number = latest?.balanceAfterMg ?? 0;

    const data = agg[0] ?? { openingReserveMg: 0, totalIssuedMg: 0, totalReturnedMg: 0 };
    const openingReserveMg: number = data.openingReserveMg;
    const inCirculationMg: number = data.totalIssuedMg - data.totalReturnedMg;

    return {
      openingReserveGrams: openingReserveMg / 1000,
      availableGoldGrams: currentBalanceMg / 1000,
      issuedGoldGrams: data.totalIssuedMg / 1000,
      returnedGoldGrams: data.totalReturnedMg / 1000,
      inCirculationGrams: inCirculationMg / 1000,
      reserveRemainingPercent:
        openingReserveMg > 0
          ? parseFloat(((currentBalanceMg / openingReserveMg) * 100).toFixed(2))
          : 0,
    };
  }

  async getTransactions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.txModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.txModel.countDocuments(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCurrentBalanceMg(): Promise<number> {
    const latest = await this.txModel.findOne().sort({ createdAt: -1 }).lean();
    return latest?.balanceAfterMg ?? 0;
  }

  async recordIssuance(amountMg: number, issuanceId: Types.ObjectId, authorizedBy: Types.ObjectId) {
    const balance = await this.getCurrentBalanceMg();
    return this.txModel.create({
      type: TreasuryTxType.ISSUANCE,
      amountMg: -amountMg,
      balanceAfterMg: balance - amountMg,
      issuanceRef: issuanceId,
      authorizedBy,
      description: `Gold issued — ${(amountMg / 1000).toFixed(3)} g`,
    });
  }

  async recordReceipt(amountMg: number, receiptId: Types.ObjectId, authorizedBy: Types.ObjectId) {
    const balance = await this.getCurrentBalanceMg();
    return this.txModel.create({
      type: TreasuryTxType.RECEIPT,
      amountMg,
      balanceAfterMg: balance + amountMg,
      receiptRef: receiptId,
      authorizedBy,
      description: `Gold received — ${(amountMg / 1000).toFixed(3)} g`,
    });
  }

  private async seedOpeningBalance() {
    const exists = await this.txModel.findOne({ type: TreasuryTxType.OPENING_BALANCE });
    if (exists) return;
    const reserveMg = this.config.get<number>('treasury.openingReserveMg') ?? 1000000;
    await this.txModel.create({
      type: TreasuryTxType.OPENING_BALANCE,
      amountMg: reserveMg,
      balanceAfterMg: reserveMg,
      authorizedBy: new Types.ObjectId('000000000000000000000000'),
      description: 'Opening treasury balance',
    });
  }
}
