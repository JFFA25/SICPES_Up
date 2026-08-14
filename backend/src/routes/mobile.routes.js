const express = require("express");
const router = express.Router();

const { loginMobileStep1, respondLoginFromWatch, verifyLoginStatus } = require("../controllers/mobile.controller");
const { getSession } = require("../controllers/auth.controller");
const {
  createReservationController,
  getMyReservation,
  getOccupiedRooms,
} = require("../controllers/reservation.controller");
const { requestPayment, getMyPayments } = require("../controllers/payment.controller");
const { verifyToken } = require("../middlewares/jwt.middleware");

// ---------- LOGIN EN DOS PASOS (todavía sin token) ----------
router.post("/login", loginMobileStep1);            // celular: email + password
router.post("/login/respond", respondLoginFromWatch); // reloj: aprueba/rechaza
router.post("/login/status", verifyLoginStatus);     // celular: hace polling hasta obtener el token

// ---------- A PARTIR DE AQUÍ TODO REQUIERE Authorization: Bearer <token> ----------
router.get("/session", verifyToken, getSession);

router.get("/reservation", verifyToken, getMyReservation);
router.post("/reservation", verifyToken, createReservationController);
router.get("/reservation/occupied", verifyToken, getOccupiedRooms);

router.get("/payments", verifyToken, getMyPayments);
router.post("/payments/request", verifyToken, requestPayment);

module.exports = router;
