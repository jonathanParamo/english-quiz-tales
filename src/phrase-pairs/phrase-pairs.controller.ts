import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PhrasePairsService } from './phrase-pairs.service';
import {
  CreatePhrasePairDto,
  CreatePhrasePairBulkItemDto,
  UpdatePhrasePairDto,
} from './dto/phrase-pair.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ImageKitService } from '../common/imagekit.service';

@Controller('phrase-pairs')
@UseGuards(JwtAuthGuard)
export class PhrasePairsController {
  constructor(
    private readonly phrasePairsService: PhrasePairsService,
    private readonly imageKitService: ImageKitService,
  ) {}

  // ── POST /phrase-pairs ────────────────────────────────────────────────
  // individual con audios e imagen opcionales.
  @Post()
  @Roles('god')
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioEs', maxCount: 1 },
      { name: 'audioEn', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  async create(
    @UploadedFiles()
    files: {
      audioEs?: Express.Multer.File[];
      audioEn?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
    @Body() body: CreatePhrasePairDto,
  ) {
    if (!body.spanish?.trim() || !body.english?.trim()) {
      throw new BadRequestException(
        'Los campos spanish e english son obligatorios.',
      );
    }

    const audioEs = files?.audioEs?.[0]
      ? await this.imageKitService.uploadAudio(files.audioEs[0])
      : undefined;

    const audioEn = files?.audioEn?.[0]
      ? await this.imageKitService.uploadAudio(files.audioEn[0])
      : undefined;

    const image = files?.image?.[0]
      ? await this.imageKitService.uploadImage(files.image[0])
      : undefined;

    return this.phrasePairsService.create({
      ...body,
      ...(audioEs && { audioEs }),
      ...(audioEn && { audioEn }),
      ...(image && { image }),
    });
  }

  // ── POST /phrase-pairs/bulk ───────────────────────────────────────────
  // Importación masiva sin archivos.
  @Post('bulk')
  @Roles('god')
  @UseGuards(RolesGuard)
  async createBulk(@Body() body: CreatePhrasePairBulkItemDto[]) {
    if (!Array.isArray(body) || body.length === 0) {
      throw new BadRequestException(
        'Se esperaba un array con al menos un par.',
      );
    }
    const invalid = body.filter(
      (p) => !p.spanish?.trim() || !p.english?.trim(),
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `${invalid.length} par(es) no tienen spanish/english. Revisa el array.`,
      );
    }
    return this.phrasePairsService.createMany(body);
  }

  // ── GET /phrase-pairs ─────────────────────────────────────────────────
  @Get()
  async findAll(
    @Req() req: any,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    const userRole = (req.user as any)?.role;

    if (category === 'gothic' && userRole !== 'god') {
      throw new ForbiddenException('No tienes acceso a esta categoría.');
    }

    return this.phrasePairsService.findAll({ level, category, type, userRole });
  }

  // ── GET /phrase-pairs/categories ──────────────────────────────────────
  @Get('categories')
  async getCategories(@Req() req: any, @Query('level') level?: string) {
    const userRole = (req.user as any)?.role;
    return this.phrasePairsService.getCategories(level, userRole);
  }

  // ── GET /phrase-pairs/stats ───────────────────────────────────────────
  @Get('stats')
  @Roles('god')
  @UseGuards(RolesGuard)
  async getStats() {
    return this.phrasePairsService.getCountByLevel();
  }

  // ── GET /phrase-pairs/random/:limit ───────────────────────────────────
  @Get('random/:limit')
  async getRandom(
    @Req() req: any,
    @Param('limit', ParseIntPipe) limit: number,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100.');
    }

    const userRole = (req.user as any)?.role;

    if (category === 'gothic' && userRole !== 'god') {
      throw new ForbiddenException('No tienes acceso a esta categoría.');
    }

    return this.phrasePairsService.getRandom(
      limit,
      level,
      category,
      type,
      userRole,
    );
  }

  // ── GET /phrase-pairs/:id ─────────────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.phrasePairsService.findById(id);
  }

  // ── PATCH /phrase-pairs/:id ───────────────────────────────────────────
  @Patch(':id')
  @Roles('god')
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audioEs', maxCount: 1 },
      { name: 'audioEn', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      audioEs?: Express.Multer.File[];
      audioEn?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
    @Body() body: UpdatePhrasePairDto,
  ) {
    const audioEs = files?.audioEs?.[0]
      ? await this.imageKitService.uploadAudio(files.audioEs[0])
      : undefined;

    const audioEn = files?.audioEn?.[0]
      ? await this.imageKitService.uploadAudio(files.audioEn[0])
      : undefined;

    const image = files?.image?.[0]
      ? await this.imageKitService.uploadImage(files.image[0])
      : undefined;

    return this.phrasePairsService.update(id, {
      ...body,
      ...(audioEs && { audioEs }),
      ...(audioEn && { audioEn }),
      ...(image && { image }),
    });
  }

  // ── DELETE /phrase-pairs/:id ──────────────────────────────────────────
  @Delete(':id')
  @Roles('god')
  @UseGuards(RolesGuard)
  async delete(@Param('id') id: string) {
    return this.phrasePairsService.delete(id);
  }

  // ── DELETE /phrase-pairs/category/:category ───────────────────────────
  @Delete('category/:category')
  @Roles('god')
  @UseGuards(RolesGuard)
  async deleteByCategory(@Param('category') category: string) {
    return this.phrasePairsService.deleteByCategory(category);
  }
}
