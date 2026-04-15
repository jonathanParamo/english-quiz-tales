import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentSchema } from './document.schema';
import { AiModule } from '../ai/ai.module';
import { TextParserService } from './parsers';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Document', schema: DocumentSchema }]),
    AiModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, TextParserService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
