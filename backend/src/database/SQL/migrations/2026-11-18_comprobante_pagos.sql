-- Guarda la URL del comprobante de pago. Los archivos viven en Cloudinary, no en TiDB.
-- Ejecutar una sola vez en la base de datos `sicpes`.

ALTER TABLE `tbd_pagos`
  ADD COLUMN `comprobante_url` varchar(512) DEFAULT NULL
  COMMENT 'URL segura del comprobante (imagen o PDF) almacenado en Cloudinary';
