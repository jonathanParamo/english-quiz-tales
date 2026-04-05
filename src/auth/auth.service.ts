import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel('Result') private readonly resultModel: Model<any>, // 👈
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user);
  }

  async generateToken(user: any) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    // Calcular progreso real del usuario
    const results = await this.resultModel
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const totalResults = results.length;

    const avgScore =
      totalResults > 0
        ? Math.round(
            results.reduce((acc, r) => {
              const pct =
                r.totalQuestions > 0
                  ? (r.correctCount / r.totalQuestions) * 100
                  : 0;
              return acc + pct;
            }, 0) / totalResults,
          )
        : 0;

    const recentMistakes = results
      .slice(0, 3)
      .flatMap((r) => r.answers ?? [])
      .filter((a: any) => !a.correct)
      .map((a: any) => a.questionText as string)
      .slice(0, 5);

    return {
      access_token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        avgScore, // 👈
        progress: {
          // 👈
          totalResults,
          avgScore,
          recentMistakes,
          level: 'beginner',
        },
      },
    };
  }

  validateToken(token: string): any | null {
    try {
      return this.jwtService.verify(token);
    } catch {
      return null;
    }
  }
}
