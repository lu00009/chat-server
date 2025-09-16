// src/config/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const getCloudinaryUrl = (
  publicId: string,
  options: object = {},
  resourceType: "image" | "video" | "raw" = "image",
) => {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    ...options,
  });
};

// Named export for the uploader to allow importing just the uploader in TS files
export const uploader = cloudinary.uploader;

export default cloudinary;
