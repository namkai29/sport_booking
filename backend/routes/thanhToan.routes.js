const express = require("express");
const router = express.Router();

const controller = require("../controllers/thanhToan.controller");
const auth = require("../middleware/authMiddleware");

router.post("/:datSanId/start-online", auth, controller.startOnlinePayment);
router.post("/:datSanId/confirm-online", auth, controller.confirmOnlinePayment);

module.exports = router;
