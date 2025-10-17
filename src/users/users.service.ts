import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<any>,
    private readonly jwtService: JwtService,
  ) {}

  async create(userData: any, res: Response): Promise<any> {
    if (!userData.password) {
      throw new Error('Password is required');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = new this.userModel({
      ...userData,
      password: hashedPassword,
      role: userData.role ?? 'student',
    });

    const savedUser = await newUser.save();

    const token = this.jwtService.sign({
      id: savedUser._id,
      email: savedUser.email,
      role: savedUser.role,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    const { password, ...userWithoutPassword } = savedUser.toObject();

    return { user: userWithoutPassword, token };
  }

  async findById(id: string): Promise<any> {
    return this.userModel.findById(id).exec();
  }

  async findByRole(role: string): Promise<any[]> {
    return this.userModel.find({ role }).exec();
  }

  async isGod(id: string): Promise<boolean> {
    const user = await this.findById(id);
    return user?.role === 'god';
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      return user.toObject();
    }
    return null;
  }
}
