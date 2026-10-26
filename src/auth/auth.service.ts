import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../users/user.schema';
import { RefreshToken, RefreshTokenDocument } from './refresh-token.schema';
import { LoginDto } from './auth.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private tokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ username: dto.username.toLowerCase() });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid username or password.');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    await this.userModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: {
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        role: user.role,
        employeeCode: user.employeeCode,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refresh(refreshToken: string) {
    const record = await this.tokenModel.findOne({
      token: refreshToken,
      revoked: false,
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Rotate — revoke old, issue new
    await this.tokenModel.findByIdAndUpdate(record._id, { revoked: true });

    const user = await this.userModel.findById(record.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found.');
    }
    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    await this.tokenModel.findOneAndUpdate({ token: refreshToken }, { revoked: true });
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash').lean();
    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  // Seed demo users on startup if none exist
  async seedDemoUsers() {
    const count = await this.userModel.countDocuments();
    if (count > 0) return;

    const rounds = this.config.get<number>('bcrypt.rounds') ?? 12;
    const hash = (p: string) => bcrypt.hash(p, rounds);

    await this.userModel.insertMany([
      {
        name: 'Workshop Manager',
        username: 'manager',
        passwordHash: await hash('demo1234'),
        role: 'manager',
        employeeCode: 'MGR-001',
        isActive: true,
      },
      {
        name: 'Admin User',
        username: 'admin',
        passwordHash: await hash('demo1234'),
        role: 'admin',
        employeeCode: 'ADM-001',
        isActive: true,
      },
      {
        name: 'Raju Kumar',
        username: 'karagar1',
        passwordHash: await hash('demo1234'),
        role: 'karagar',
        employeeCode: 'GC-001',
        isActive: true,
      },
      {
        name: 'Suresh Patil',
        username: 'karagar2',
        passwordHash: await hash('demo1234'),
        role: 'karagar',
        employeeCode: 'GC-002',
        isActive: true,
      },
    ]);
  }

  private async generateTokens(user: UserDocument) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.tokenModel.create({
      userId: new Types.ObjectId(user._id.toString()),
      token: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
