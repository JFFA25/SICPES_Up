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

const getRoomFolder = () => {
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  return `sicpes/${environment}/rooms`;
};

// Sube una foto de habitación (ya optimizada). Devuelve la URL y el public_id (para poder borrarla).
const uploadRoomPhoto = (buffer, roomId) => {
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: getRoomFolder(),
        public_id: `room-${roomId}-${Date.now()}`,
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result?.public_id) {
          return reject(new Error("Cloudinary no devolvió una URL segura."));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(buffer);
  });
};

const getResidenceFolder = () => {
  const environment = process.env.NODE_ENV === "production" ? "production" : "development";
  return `sicpes/${environment}/residence`;
};

// Foto de la galería de "La residencia" (ya optimizada).
const uploadResidencePhoto = (buffer) => {
  configure();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: getResidenceFolder(),
        public_id: `residence-${Date.now()}`,
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result?.public_id) {
          return reject(new Error("Cloudinary no devolvió una URL segura."));
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(buffer);
  });
};

const deleteImage = async (publicId) => {
  configure();
  return cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
};

module.exports = { isConfigured, uploadAvatar, uploadReceipt, uploadRoomPhoto, uploadResidencePhoto, deleteImage };
