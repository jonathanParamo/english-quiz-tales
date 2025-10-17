import { Injectable } from '@nestjs/common';
import ImageKit from 'imagekit';

@Injectable()
export class ImageKitService {
  private imagekit: ImageKit;

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY ?? '',
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? '',
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT ?? '',
    });
  }

  async uploadAudio(file: Express.Multer.File): Promise<string> {
    const buffer = file.buffer;

    const result = await this.imagekit.upload({
      file: buffer,
      fileName: file.originalname,
      folder: '/audio',
    });

    return result.url;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const buffer = file.buffer;

    const result = await this.imagekit.upload({
      file: buffer,
      fileName: file.originalname,
      folder: '/images',
    });

    return result.url;
  }
}
