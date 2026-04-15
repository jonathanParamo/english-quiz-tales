import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import type { SaveSessionDto } from './progress.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // POST /api/v1/progress/session
  @Post('session')
  async saveSession(@Req() req: any, @Body() body: SaveSessionDto) {
    return this.progressService.saveSession(req.user.id, body);
  }

  // GET /api/v1/progress
  @Get()
  async getAllProgress(@Req() req: any) {
    return this.progressService.getAllProgress(req.user.id);
  }

  // GET /api/v1/progress/:documentId
  @Get(':documentId')
  async getProgressByDocument(
    @Param('documentId') documentId: string,
    @Req() req: any,
  ) {
    return this.progressService.getProgressByDocument(req.user.id, documentId);
  }

  // GET /api/v1/progress/:documentId/sessions
  @Get(':documentId/sessions')
  async getSessionHistory(
    @Param('documentId') documentId: string,
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.progressService.getSessionHistory(
      req.user.id,
      documentId,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
