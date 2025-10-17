import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { StorySchema } from './story.schema';
import { RolesGuard } from '../auth/roles.guard';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Story', schema: StorySchema }]),
    CommonModule,
  ],
  controllers: [StoriesController],
  providers: [StoriesService, RolesGuard],
})
export class StoriesModule {}
