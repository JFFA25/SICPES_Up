-- Notificaciones push (PWA) y bandeja de avisos dentro de la app.
-- Ejecutar una sola vez en TiDB/MySQL.

CREATE TABLE IF NOT EXISTS tbd_push_suscripciones (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL COMMENT 'Dueño de la suscripción (un usuario puede tener varios dispositivos).',
  endpoint_hash CHAR(64) NOT NULL COMMENT 'SHA-256 del endpoint, para poder hacerlo único.',
  endpoint TEXT NOT NULL COMMENT 'URL del servicio push del navegador.',
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_endpoint (endpoint_hash),
  KEY idx_push_usuario (usuario_id),
  CONSTRAINT fk_push_usuario FOREIGN KEY (usuario_id) REFERENCES tbd_usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbd_notificaciones (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo VARCHAR(40) NOT NULL COMMENT 'reservacion_aceptada, pago_confirmado, nueva_reservacion, etc.',
  titulo VARCHAR(120) NOT NULL,
  cuerpo VARCHAR(255) NOT NULL,
  url VARCHAR(255) DEFAULT '/dashboard',
  leida TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_usuario (usuario_id, leida, creado_en),
  CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES tbd_usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
