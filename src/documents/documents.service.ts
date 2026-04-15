import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { TextParserService } from './parsers';

interface ParsedDocumentContent {
  contentType: 'verbs' | 'vocabulary' | 'story' | 'mixed';
  title: string;
  summary: string;
  verbs: {
    infinitive: string;
    pastSimple: string;
    pastParticiple: string;
    spanish: string;
    example: string;
  }[];
  vocabulary: {
    word: string;
    type: string;
    definition: string;
    spanish: string;
    example: string;
  }[];
  paragraphs: string[];
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel('Document') private readonly documentModel: Model<any>,
    private readonly aiService: AiService,
    private readonly textParser: TextParserService,
  ) {}

  private async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text?.trim() ?? '';
    }

    if (
      mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      // mammoth: npm i mammoth
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() ?? '';
    }

    throw new BadRequestException(
      'Formato no soportado. Sube un archivo PDF o DOCX.',
    );
  }

  async parseDocumentContent(
    rawText: string,
    parsed: any,
  ): Promise<ParsedDocumentContent> {
    return this.aiService.parseDocumentContent(rawText, parsed);
  }

  async uploadAndProcess(
    file: Express.Multer.File,
    userId: string,
  ): Promise<any> {
    if (!file) throw new BadRequestException('No se recibió ningún archivo.');

    const rawText = await this.extractText(file.buffer, file.mimetype);

    if (!rawText || rawText.length < 20) {
      throw new BadRequestException(
        'El archivo está vacío o no se pudo extraer texto.',
      );
    }

    const textForAi = rawText.slice(0, 6000);
    const parsed = this.textParser.parse(rawText);

    const structured = await this.aiService.parseDocumentContent(
      textForAi,
      parsed,
    );

    const doc = await this.documentModel.create({
      userId: new Types.ObjectId(userId),
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      rawText,
      contentType: structured.contentType,
      title: structured.title,
      summary: structured.summary,
      verbs: structured.verbs ?? [],
      vocabulary: structured.vocabulary ?? [],
      paragraphs: structured.paragraphs ?? [],
    });

    return doc;
  }

  async generateQuiz(
    documentId: string,
    userId: string,
    count: 5 | 10 | 15 = 5,
    level: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  ): Promise<any> {
    const doc = await this.documentModel.findOne({
      _id: documentId,
      userId: new Types.ObjectId(userId),
    });

    if (!doc) throw new BadRequestException('Documento no encontrado.');

    const contextText =
      doc.contentType === 'verbs'
        ? doc.verbs
            .map(
              (v: any) =>
                `${v.infinitive} - past: ${v.pastSimple} - pp: ${v.pastParticiple}. Example: ${v.example}`,
            )
            .join('\n')
        : doc.contentType === 'vocabulary'
          ? doc.vocabulary
              .map(
                (v: any) =>
                  `${v.word} (${v.type}): ${v.definition}. ${v.example}`,
              )
              .join('\n')
          : doc.paragraphs.join('\n');

    const result = await this.aiService.generateQuestionsFromStory(
      doc.title || doc.originalName,
      contextText,
      level,
      count,
    );

    return result;
  }

  async reviewWriting(
    documentId: string,
    userId: string,
    userText: string,
  ): Promise<any> {
    const doc = await this.documentModel.findOne({
      _id: documentId,
      userId: new Types.ObjectId(userId),
    });

    if (!doc) throw new BadRequestException('Documento no encontrado.');

    const targetWords =
      doc.contentType === 'verbs'
        ? doc.verbs.map((v: any) => v.infinitive)
        : doc.vocabulary.map((v: any) => v.word);

    return this.aiService.reviewWriting(userText, targetWords, doc.summary);
  }

  async findAllByUser(userId: string): Promise<any[]> {
    return this.documentModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('-rawText -generatedQuestions')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string, userId: string): Promise<any> {
    return this.documentModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    await this.documentModel.findOneAndDelete({
      _id: id,
      userId: new Types.ObjectId(userId),
    });
    return { message: 'Documento eliminado.' };
  }
}
