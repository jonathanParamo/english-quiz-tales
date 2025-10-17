import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFiles,
  UseInterceptors,
  Body,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { StoriesService } from './stories.service';
import {
  uploadAudioToCloudinary,
  uploadImageToCloudinary,
} from '../common/cloudinary.utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ImageKitService } from 'src/common/imagekit.service';
import * as multer from 'multer';

@Controller('stories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly imageKitService: ImageKitService,
  ) {}

  // @Post('create')
  // @Roles('god')
  // @UseInterceptors(
  //   FileFieldsInterceptor([
  //     { name: 'audio', maxCount: 1 },
  //     { name: 'image', maxCount: 5 },
  //   ]),
  // )
  // async createStoryWithAssets(
  //   @UploadedFiles() files: { audio?: any[]; image?: any[] },
  //   @Body() body: any,
  // ) {
  //   try {
  //     const audioFile = files.audio?.[0];
  //     const audioUrl = audioFile
  //       ? await uploadAudioToCloudinary(audioFile)
  //       : null;

  //     const imageFiles = files.image || [];
  //     const imageUrls: string[] = [];

  //     for (const img of imageFiles) {
  //       const url = await uploadImageToCloudinary(img);
  //       imageUrls.push(url);
  //     }

  //     const storyData = {
  //       title: body.title,
  //       level: body.level,
  //       text: body.text,
  //       audioUrl,
  //       images: imageUrls,
  //     };

  //     const savedStory = await this.storiesService.create(storyData);

  //     return savedStory;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  @Get('available')
  async getAvailableStories() {
    const stories = await this.storiesService.findAll();

    return stories.map((story) => ({
      id: story._id,
      title: story.title,
      level: story.level,
      image: story.images?.[0] || null,
    }));
  }

  @Post('create')
  @Roles('god')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'audio', maxCount: 1 },
        { name: 'image', maxCount: 5 },
      ],
      {
        storage: multer.memoryStorage(),
      },
    ),
  )
  async createStoryWithAssets(
    @UploadedFiles()
    files: { audio?: Express.Multer.File[]; image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    try {
      const audioFile = files.audio?.[0];
      const audioUrl = audioFile
        ? await this.imageKitService.uploadAudio(audioFile)
        : null;

      const imageFiles = files.image || [];
      const imageUrls: string[] = [];

      for (const img of imageFiles) {
        const url = await this.imageKitService.uploadImage(img);
        imageUrls.push(url);
      }

      const storyData = {
        title: body.title,
        level: body.level,
        text: body.text,
        audioUrl,
        images: imageUrls,
      };

      const savedStory = await this.storiesService.create(storyData);
      return savedStory;
    } catch (error) {
      console.error('Error al crear historia:', error);
      throw new InternalServerErrorException('No se pudo crear la historia');
    }
  }

  @Get()
  async getAllStories() {
    return this.storiesService.findAll();
  }

  @Get(':id')
  async getStoryById(@Param('id') id: string) {
    console.log(id);
    return this.storiesService.findById(id);
  }
}
