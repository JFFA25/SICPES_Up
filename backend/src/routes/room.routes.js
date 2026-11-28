const express = require("express");
const router = express.Router();
const roomController = require("../controllers/room.controller");
const { isAdmin } = require("../middlewares/auth.middleware");
const { parseRoomPhoto } = require("../middlewares/roomPhotoUpload");

// Rutas publicas (usuarios las necesitan para ver disponibles)
router.get("/", roomController.getRooms);
router.get("/details", roomController.getRoomDetails);

// Rutas admin
router.get("/admin/details", isAdmin, roomController.getRoomDetailsAdmin);
router.post("/", isAdmin, roomController.addRooms);
router.put("/:id", isAdmin, roomController.updateRoom);
router.post("/:id/photos", isAdmin, parseRoomPhoto, roomController.uploadRoomPhoto);
router.put("/photos/:photoId/cover", isAdmin, roomController.setCoverPhoto);
router.delete("/photos/:photoId", isAdmin, roomController.deleteRoomPhoto);
router.delete("/item/:id", isAdmin, roomController.deleteRoom);
router.delete("/:piso", isAdmin, roomController.deleteFloor);

module.exports = router;
