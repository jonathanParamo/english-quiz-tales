import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { StoriesModule } from './stories/stories.module';
import { QuestionsModule } from './questions/questions.module';
import { AuthModule } from './auth/auth.module';
import { AnswerModule } from './answer/answer.module';
import { AiModule } from './ai/ai.module';
import { PhrasePairsModule } from './phrase-pairs/phrase-pairs.module';
import { DocumentsModule } from './documents/documents.module';
import { ProgressModule } from './progress/progress.module';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    DatabaseModule,
    StoriesModule,
    QuestionsModule,
    AuthModule,
    AnswerModule,
    AiModule,
    PhrasePairsModule,
    DocumentsModule,
    ProgressModule,
    VideosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
