import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<any>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<any> {
    const { password, ...rest } = createUserDto;

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      ...rest,
      password: hashedPassword,
      role: createUserDto.role ?? 'student',
    });

    const savedUser = await newUser.save();

    const token = this.jwtService.sign({
      id: savedUser._id,
      email: savedUser.email,
      role: savedUser.role,
    });

    const { password: _, ...userWithoutPassword } = savedUser.toObject();

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
      const { password: _, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword;
    }
    return null;
  }
}
