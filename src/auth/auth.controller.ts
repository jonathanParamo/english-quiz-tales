import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', access_token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { user };
  }

  @Get('check')
  checkAuth(@Req() req: Request) {
    const token = req.cookies?.token;
    const decoded = this.authService.validateToken(token);

    if (!token || !decoded) {
      throw new UnauthorizedException('Not authenticated');
    }

    return {
      status: 'ok',
      user: {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      },
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    return { message: 'Logged out successfully' };
  }
}
