const express = require("express");
const router = express.Router();

const controller = require("../controllers/thanhToan.controller");
const auth = require("../middleware/authMiddleware");

router.get("/online/available", controller.onlineAvailable);
router.get("/vnpay/available", controller.vnpayAvailable);
router.get("/vnpay/ipn", controller.vnpayIpn);
router.get("/vnpay/return", auth, controller.vnpayProcessReturn);
router.get("/:datSanId/status", auth, controller.getPaymentStatus);
router.post("/:datSanId/start-online", auth, controller.startOnlinePayment);

module.exports = router;
