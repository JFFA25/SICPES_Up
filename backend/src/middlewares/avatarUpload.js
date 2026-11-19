const multer = require("multer");

// La web manda el tipo correcto; la app móvil a veces manda application/octet-stream.
// El contenido real se valida después con sharp en profile.controller.
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/octet-stream"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Elige una imagen JPG, PNG o WebP"));
    }
    callback(null, true);
  },
});

const parseAvatar = (req, res, next) => {
  upload.single("avatar")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "La imagen debe pesar 3 MB o menos" });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: "No se pudo recibir la imagen seleccionada" });
    }
    return res.status(400).json({ error: error.message || "Archivo de imagen inválido" });
  });
};

module.exports = { parseAvatar };
