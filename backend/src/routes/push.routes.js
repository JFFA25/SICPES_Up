const express = require("express");
const router = express.Router();
const c = require("../controllers/push.controller");

// Se monta en /api  ->  /api/push/...  y  /api/notifications/...
router.get("/push/public-key", c.getPublicKey);
router.post("/push/subscribe", c.subscribe);
router.post("/push/unsubscribe", c.unsubscribe);
router.post("/push/test", c.sendTest);

router.get("/notifications", c.listNotifications);
router.put("/notifications/read-all", c.markRead);
router.put("/notifications/:id/read", c.markRead);

module.exports = router;
