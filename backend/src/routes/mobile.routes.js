const express = require("express");
const router = express.Router();

const { loginMobile, loginMobileStep1, respondLoginFromWatch, verifyLoginStatus } = require("../controllers/mobile.controller");
const { getSession, googleLoginMobile } = require("../controllers/auth.controller");
const {
  createReservationController,
  getMyReservation,
  getAllReservations,
  updateReservationStatus,
  getOccupiedRooms,
} = require("../controllers/reservation.controller");
const { requestPayment, getMyPayments, getAdminPayments, updateStatus } = require("../controllers/payment.controller");
const adminController = require("../controllers/admin.controller");
const reportsController = require("../controllers/reports.controller");
const roomController = require("../controllers/room.controller");
const { getMyProfile, uploadMyAvatar } = require("../controllers/profile.controller");
const { parseAvatar } = require("../middlewares/avatarUpload");
const { parseReceipt } = require("../middlewares/receiptUpload");
const { parseRoomPhoto } = require("../middlewares/roomPhotoUpload");
const pushController = require("../controllers/push.controller");
const { isAdmin } = require("../middlewares/auth.middleware");
const { verifyToken } = require("../middlewares/jwt.middleware");
const { authLimiter } = require("../middlewares/rateLimiter");

// Native app login returns a bearer token. Keep the two-step watch flow available.
router.post("/auth/login", authLimiter, loginMobile);
router.post("/auth/google", authLimiter, googleLoginMobile);
router.post("/login", authLimiter, loginMobileStep1); // celular: email + password
router.post("/login/respond", respondLoginFromWatch); // reloj: aprueba/rechaza
router.post("/login/status", verifyLoginStatus);     // celular: hace polling hasta obtener el token

router.use(verifyToken);

router.get("/session", getSession);
router.get("/profile", getMyProfile);
router.post("/profile/avatar", parseAvatar, uploadMyAvatar);
router.get("/rooms", roomController.getRooms);
router.get("/rooms/details", roomController.getRoomDetails);
router.get("/settings", adminController.getPublicSettings);
router.get("/reservation", getMyReservation);
router.post("/reservation", createReservationController);
router.get("/reservation/occupied", getOccupiedRooms);
router.get("/payments", getMyPayments);
router.post("/payments/request", parseReceipt, requestPayment);
router.get("/notifications", pushController.listNotifications);
router.put("/notifications/read-all", pushController.markRead);
router.put("/notifications/:id/read", pushController.markRead);

router.get("/admin/reservations", isAdmin, getAllReservations);
router.put("/admin/reservations/:id", isAdmin, updateReservationStatus);
router.get("/admin/payments", isAdmin, getAdminPayments);
router.put("/admin/payments/:id/status", isAdmin, updateStatus);
router.get("/admin/settings", isAdmin, adminController.getSettings);
router.put("/admin/settings", isAdmin, adminController.updateSettings);
router.get("/admin/rooms/details", isAdmin, roomController.getRoomDetailsAdmin);
router.post("/admin/rooms", isAdmin, roomController.addRooms);
router.put("/admin/rooms/:id", isAdmin, roomController.updateRoom);
router.post("/admin/rooms/:id/photos", isAdmin, parseRoomPhoto, roomController.uploadRoomPhoto);
router.put("/admin/rooms/photos/:photoId/cover", isAdmin, roomController.setCoverPhoto);
router.delete("/admin/rooms/photos/:photoId", isAdmin, roomController.deleteRoomPhoto);
router.delete("/admin/rooms/item/:id", isAdmin, roomController.deleteRoom);
router.delete("/admin/rooms/:piso", isAdmin, roomController.deleteFloor);
router.get("/admin/dashboard-stats", isAdmin, reportsController.getDashboardStats);

module.exports = router;
