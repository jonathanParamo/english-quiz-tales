import './cloudinary.config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export function uploadAudioToCloudinary(
  file: Express.Multer.File,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'magic-english-audios',
      },
      (error, result) => {
        if (error || !result)
          return reject(error || new Error('No result from Cloudinary'));
        resolve(result.secure_url);
      },
    );

    Readable.from(file.buffer).pipe(stream);
  });
}

export function uploadImageToCloudinary(file: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'magic-english-images',
      },
      (error, result) => {
        if (error || !result)
          return reject(error || new Error('No result from Cloudinary'));
        resolve(result.secure_url);
      },
    );
    Readable.from(file.buffer).pipe(stream);
  });
}

export const uploadVideoToCloudinary = (
  file: Express.Multer.File,
): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'videos',
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result?.secure_url || '',
          public_id: result?.public_id || '',
        });
      },
    );

    Readable.from(file.buffer).pipe(stream);
  });
};
