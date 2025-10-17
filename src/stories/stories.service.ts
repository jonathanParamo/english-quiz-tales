import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class StoriesService {
  constructor(@InjectModel('Story') private readonly storyModel: Model<any>) {}

  async create(storyData: any): Promise<any> {
    const newStory = new this.storyModel(storyData);
    return newStory.save();
  }

  async findAll(): Promise<any[]> {
    return this.storyModel.find().exec();
  }

  async findById(id: string): Promise<any> {
    return this.storyModel.findById(id).exec();
  }
}
