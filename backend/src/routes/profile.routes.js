const express = require("express");
const { requireSession } = require("../middlewares/auth.middleware");
const { parseAvatar } = require("../middlewares/avatarUpload");
const { getMyProfile, uploadMyAvatar } = require("../controllers/profile.controller");

const router = express.Router();

router.get("/me", requireSession, getMyProfile);
router.post("/me/avatar", requireSession, parseAvatar, uploadMyAvatar);

module.exports = router;
