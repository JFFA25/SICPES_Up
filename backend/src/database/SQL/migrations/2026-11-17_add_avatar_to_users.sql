-- Guarda la URL del avatar. Los archivos se almacenan en Cloudinary, no en TiDB.
-- Ejecutar una sola vez en la base de datos `sicpes`.

ALTER TABLE `tbd_usuarios`
  ADD COLUMN `foto_perfil_url` varchar(512) DEFAULT NULL
  COMMENT 'URL segura de la foto de perfil almacenada en Cloudinary';
