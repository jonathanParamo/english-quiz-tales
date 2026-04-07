import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreatePhrasePairDto,
  UpdatePhrasePairDto,
} from './dto/phrase-pair.dto';
import { PhrasePair } from './schema/phrase-pair.schema';

@Injectable()
export class PhrasePairsService {
  constructor(
    @InjectModel('PhrasePair')
    private readonly phrasePairModel: Model<PhrasePair>,
  ) {}

  // ── Crear uno ────────────────────────────────────────────────────────
  async create(data: CreatePhrasePairDto): Promise<PhrasePair> {
    const pair = new this.phrasePairModel(data);
    return pair.save();
  }

  // ── Crear muchos (bulk sin audio) ────────────────────────────────────
  async createMany(pairs: CreatePhrasePairDto[]): Promise<PhrasePair[]> {
    return this.phrasePairModel.insertMany(pairs) as unknown as PhrasePair[];
  }

  // ── Listar con filtros ───────────────────────────────────────────────
  async findAll(filters?: {
    level?: string;
    category?: string;
    type?: string;
  }): Promise<PhrasePair[]> {
    const query: Record<string, any> = {};
    if (filters?.level) query.level = filters.level;
    if (filters?.category) query.category = filters.category;
    if (filters?.type) query.type = filters.type;
    return this.phrasePairModel.find(query).sort({ createdAt: -1 }).exec();
  }

  // ── Obtener uno por ID ───────────────────────────────────────────────
  async findById(id: string): Promise<PhrasePair> {
    const pair = await this.phrasePairModel.findById(id).exec();
    if (!pair) throw new NotFoundException(`PhrasePair ${id} no encontrado`);
    return pair;
  }

  // ── N pares aleatorios por nivel (para el juego) ─────────────────────
  // Garantiza que vengan mezclados y sin duplicados dentro de la sesión.
  async getRandom(
    limit: number,
    level?: string,
    category?: string,
    type?: string,
  ): Promise<PhrasePair[]> {
    const match: Record<string, any> = {};
    if (level) match.level = level;
    if (category) match.category = category;
    if (type) match.type = type;

    return this.phrasePairModel.aggregate([
      { $match: match },
      { $sample: { size: Math.min(limit, 100) } },
    ]);
  }

  // ── Listar todas las categorías disponibles (para selector en UI) ────
  async getCategories(level?: string): Promise<string[]> {
    const match: Record<string, any> = { category: { $ne: null } };
    if (level) match.level = level;

    const result = await this.phrasePairModel.aggregate([
      { $match: match },
      { $group: { _id: '$category' } },
      { $sort: { _id: 1 } },
    ]);

    return result.map((r) => r._id).filter(Boolean);
  }

  // ── Contar pares por nivel ───────────────────────────────────────────
  async getCountByLevel(): Promise<Record<string, number>> {
    const result = await this.phrasePairModel.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
    ]);

    return result.reduce(
      (acc, { _id, count }) => ({ ...acc, [_id]: count }),
      {},
    );
  }

  // ── Actualizar ───────────────────────────────────────────────────────
  async update(id: string, data: UpdatePhrasePairDto): Promise<PhrasePair> {
    const updated = await this.phrasePairModel
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException(`PhrasePair ${id} no encontrado`);
    return updated;
  }

  async delete(id: string): Promise<{ message: string }> {
    const deleted = await this.phrasePairModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`PhrasePair ${id} no encontrado`);
    return { message: 'Phrase pair eliminado correctamente' };
  }

  async deleteByCategory(category: string): Promise<{ deleted: number }> {
    const result = await this.phrasePairModel.deleteMany({ category }).exec();
    return { deleted: result.deletedCount ?? 0 };
  }
}
