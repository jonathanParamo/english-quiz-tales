import { Controller, Post, Body, Get, Param, Res } from '@nestjs/common';
import { UsersService } from './users.service';
import type { Response } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async create(@Body() userData: any, @Res() res: Response) {
    const result = await this.usersService.create(userData, res);
    return res.json(result);
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
