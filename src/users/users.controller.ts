import { Controller, Post, Body, Get, Param, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { Response } from 'express';

// ✅ FIX de rutas: las rutas específicas DEBEN ir antes que las dinámicas (:id).
// Antes: GET /:id se registraba primero y capturaba /role/student e /is-god/123
// como si "role" e "is-god" fueran IDs → MongoDB lanzaba CastError.

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('signup')
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const { user } = await this.usersService.create(createUserDto);

    const { access_token } = await this.authService.generateToken(user);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.json({ user });
  }

  @Get('role/:role')
  async getUsersByRole(@Param('role') role: string) {
    return this.usersService.findByRole(role);
  }

  @Get('is-god/:id')
  async checkIfGod(@Param('id') id: string) {
    return this.usersService.isGod(id);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
