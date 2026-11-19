const cloudinary = require("cloudinary").v2;

const isConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

const getFolder = () => {
  const configuredFolder = process.env.CLOUDINARY_FOLDER?.trim();
  if (configuredFolder) return configuredFolder.replace(/^\/+|\/+$/g, "");

  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  return `sicpes/${environment}/avatars`;
};

const configure = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const uploadAvatar = (buffer, userId) => {
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: getFolder(),
        public_id: `user-${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) return reject(new Error("Cloudinary no devolvió una URL segura."));
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
};

const getReceiptFolder = () => {
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  return `sicpes/${environment}/receipts`;
};

// Sube un comprobante de pago. Las imágenes se guardan como "image" y los PDF como "raw"
// (así se pueden abrir sin activar la entrega de PDF en la cuenta de Cloudinary).
const uploadReceipt = (buffer, { kind, userId }) => {
  configure();

  return new Promise((resolve, reject) => {
    const options = {
      folder: getReceiptFolder(),
      public_id: `user-${userId}-${Date.now()}`,
      resource_type: kind === "pdf" ? "raw" : "image",
    };
    if (kind === "pdf") options.public_id += ".pdf";

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url) return reject(new Error("Cloudinary no devolvió una URL segura."));
      resolve(result.secure_url);
    });

    stream.end(buffer);
  });
};

module.exports = { isConfigured, uploadAvatar, uploadReceipt };
