import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig, dbConfig, jwtConfig, bcryptConfig, treasuryConfig } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { KaragarsModule } from './karagars/karagars.module';
import { JobsModule } from './jobs/jobs.module';
import { MaterialIssuanceModule } from './material-issuance/material-issuance.module';
import { MaterialReceiptsModule } from './material-receipts/material-receipts.module';
import { AdvancesModule } from './advances/advances.module';
import { PayrollModule } from './payroll/payroll.module';
import { TreasuryModule } from './treasury/treasury.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, bcryptConfig, treasuryConfig],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    KaragarsModule,
    JobsModule,
    MaterialIssuanceModule,
    MaterialReceiptsModule,
    AdvancesModule,
    PayrollModule,
    TreasuryModule,
    ReportsModule,
  ],
})
export class AppModule {}
