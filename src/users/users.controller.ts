import { Controller, Post, Body, Get, Param, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import type { Response } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const { user, token } = await this.usersService.create(createUserDto);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.json({ user });
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get('role/:role')
  async getUsersByRole(@Param('role') role: string) {
    return this.usersService.findByRole(role);
  }

  @Get('is-god/:id')
  async checkIfGod(@Param('id') id: string) {
    return this.usersService.isGod(id);
  }
}
