const express = require("express");
const router = express.Router();
const residenceController = require("../controllers/residence.controller");
const { isAdmin } = require("../middlewares/auth.middleware");
const { parseRoomPhoto } = require("../middlewares/roomPhotoUpload");

// Pública: la pantalla "La residencia" y la app móvil leen la galería.
router.get("/photos", residenceController.getPhotos);

// Solo administrador
router.post("/photos", isAdmin, parseRoomPhoto, residenceController.addPhoto);
router.put("/photos/:id", isAdmin, residenceController.updatePhoto);
router.put("/photos/:id/cover", isAdmin, residenceController.setCover);
router.delete("/photos/:id", isAdmin, residenceController.deletePhoto);

module.exports = router;
