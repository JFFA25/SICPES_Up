const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// Campo "photo". El contenido real se valida con sharp en room.controller.
const parseRoomPhoto = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "La foto debe pesar 5 MB o menos" });
    }
    return res.status(400).json({ error: "No se pudo recibir la foto seleccionada" });
  });
};

module.exports = { parseRoomPhoto };
