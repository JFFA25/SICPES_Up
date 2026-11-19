const express = require("express");
const router = express.Router();
const { requestPayment, getMyPayments, getAdminPayments, updateStatus } = require("../controllers/payment.controller");
const { parseReceipt } = require("../middlewares/receiptUpload");

router.post("/request", parseReceipt, requestPayment);
router.post("/process", parseReceipt, requestPayment);
router.get("/me", getMyPayments);
router.get("/admin", getAdminPayments);
router.put("/admin/:id/status", updateStatus);

module.exports = router;
