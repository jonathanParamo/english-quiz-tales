import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.CLOUDINARY_URL;
if (!url) throw new Error('CLOUDINARY_URL no definida');

cloudinary.config({ cloudinary_url: undefined });
process.env.CLOUDINARY_URL = url;
cloudinary.config(true);
