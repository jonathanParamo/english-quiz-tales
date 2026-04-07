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
  // Crea un par individual con audios e imagen opcionales.
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
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    return this.phrasePairsService.findAll({ level, category, type });
  }

  // ── GET /phrase-pairs/categories ──────────────────────────────────────
  @Get('categories')
  async getCategories(@Query('level') level?: string) {
    return this.phrasePairsService.getCategories(level);
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
    @Param('limit', ParseIntPipe) limit: number,
    @Query('level') level?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100.');
    }
    return this.phrasePairsService.getRandom(limit, level, category, type);
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
