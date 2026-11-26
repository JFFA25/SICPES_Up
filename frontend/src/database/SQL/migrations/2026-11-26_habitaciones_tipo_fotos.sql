-- Tipo, capacidad y fotos por habitación.
-- (Si ya ejecutaste estas sentencias, no las repitas.)
ALTER TABLE tbi_habitaciones
  ADD COLUMN tipo ENUM('individual','compartida') NOT NULL DEFAULT 'individual',
  ADD COLUMN capacidad TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN descripcion VARCHAR(255) NULL,
  ADD COLUMN activa TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS tbi_habitacion_fotos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  habitacion_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  orden TINYINT NOT NULL DEFAULT 0,
  FOREIGN KEY (habitacion_id) REFERENCES tbi_habitaciones(id) ON DELETE CASCADE
);

-- Ejemplo: marcar habitaciones compartidas (capacidad 2)
-- UPDATE tbi_habitaciones SET tipo='compartida', capacidad=2 WHERE piso='2';
