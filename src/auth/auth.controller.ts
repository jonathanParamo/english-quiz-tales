import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(
      body.email,
      body.password,
    );

    res.cookie('token', access_token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { user };
  }

  @Get('check')
  checkAuth(@Req() req: Request) {
    const token = req.cookies?.token;
    const isValid = this.authService.validateToken(token);

    if (!token || !isValid) {
      throw new UnauthorizedException('Not authenticated');
    }

    return { status: 'ok' };
  }
}
