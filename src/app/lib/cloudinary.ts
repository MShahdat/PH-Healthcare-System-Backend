import {v2 as cloudinary} from 'cloudinary'
import config from '../config/env';
import multer from 'multer';


// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});


// Use memory storage to store files as buffers temporarily
const storage = multer.memoryStorage();
const upload = multer({ storage });



export const Cloudinary = {
  cloudinary,
  upload
}