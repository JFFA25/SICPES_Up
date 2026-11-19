const createCorsOptions = ({
  frontendUrl = process.env.FRONTEND_URL || "https://localhost:5173",
  mobileWebOrigins = process.env.MOBILE_WEB_ORIGINS || "",
} = {}) => {
  const allowedOrigins = new Set(
    [frontendUrl, ...mobileWebOrigins.split(",")]
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => new URL(origin).origin)
  );

  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  };
};

module.exports = createCorsOptions;
