import { v2 as cloudinary } from "cloudinary";

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function cloudinaryConfigured() {
  return configured;
}

const DOCX_MIME =
  "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,";

/**
 * Returns a downloadable URL for the DOCX.
 * - With Cloudinary configured: uploads as a raw file and returns the secure URL.
 * - Otherwise: returns a base64 data URI so download still works locally.
 */
export async function docxUrl(buffer: Buffer, publicId: string): Promise<string> {
  if (!configured) {
    return DOCX_MIME + buffer.toString("base64");
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
        format: "docx",
        overwrite: true,
        folder: "meet-interview",
      },
      (err, res) => {
        if (err || !res) return reject(err || new Error("upload failed"));
        resolve(res.secure_url);
      }
    );
    stream.end(buffer);
  });
}
