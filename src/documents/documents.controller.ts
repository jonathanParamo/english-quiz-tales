import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // POST /api/v1/documents/upload
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.documentsService.uploadAndProcess(file, req.user.id);
  }

  // GET /api/v1/documents
  @Get()
  async findAll(@Req() req: any) {
    return this.documentsService.findAllByUser(req.user.id);
  }

  // GET /api/v1/documents/:id
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.findById(id, req.user.id);
  }

  // POST /api/v1/documents/:id/quiz
  @Post(':id/quiz')
  async generateQuiz(
    @Param('id') id: string,
    @Req() req: any,
    @Body()
    body: {
      count?: 5 | 10 | 15;
      level?: 'beginner' | 'intermediate' | 'advanced';
    },
  ) {
    return this.documentsService.generateQuiz(
      id,
      req.user.id,
      body.count ?? 5,
      body.level ?? 'beginner',
    );
  }

  // POST /api/v1/documents/:id/review-writing
  @Post(':id/review-writing')
  async reviewWriting(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { text: string },
  ) {
    return this.documentsService.reviewWriting(id, req.user.id, body.text);
  }

  // DELETE /api/v1/documents/:id
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.delete(id, req.user.id);
  }
}
