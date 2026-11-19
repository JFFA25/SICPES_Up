const multer = require("multer");

const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

// Detecta el tipo real por los primeros bytes (no confiamos en el mimetype que manda el cliente,
// la app móvil a veces lo manda como application/octet-stream).
const sniffKind = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buffer.slice(0, 5).toString("ascii") === "%PDF-") return "pdf";
  return null;
};

// Campo opcional "comprobante" (PNG, JPG, WebP o PDF, máx. 5 MB).
// Si la petición no es multipart (la web actual manda JSON) simplemente continúa.
const parseReceipt = (req, res, next) => {
  upload.single("comprobante")(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "El comprobante debe pesar 5 MB o menos" });
      }
      return res.status(400).json({ error: "No se pudo recibir el comprobante" });
    }

    if (req.file) {
      const kind = sniffKind(req.file.buffer);
      if (!kind) {
        return res.status(400).json({ error: "El comprobante debe ser PNG, JPG, WebP o PDF" });
      }
      req.file.kind = kind;
    }
    next();
  });
};

module.exports = { parseReceipt, sniffKind };
