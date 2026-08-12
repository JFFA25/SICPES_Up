const jwt = require("jsonwebtoken");

/**
 * Verifica el JWT que manda la app móvil en el header:
 *   Authorization: Bearer <token>
 *
 * Si es válido, deja el usuario decodificado en req.user y también en
 * req.session.user, para poder reutilizar sin cambios los controladores
 * web existentes (que revisan req.session.user). No se persiste nada
 * en el store de sesiones - el JWT sigue siendo la única fuente de
 * verdad para la app móvil.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (req.session) {
      req.session.user = decoded;
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado, inicia sesión de nuevo" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
};

module.exports = { verifyToken };
