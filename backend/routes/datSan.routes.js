const express = require("express");
const router = express.Router();

const controller = require("../controllers/datSan.controller");
const auth = require("../middleware/authMiddleware");

// ======================
// CREATE BOOKING
// ======================
router.post("/", auth, controller.createBooking);
// lịch sử đặt sân của user
router.get("/me", auth, controller.getMyBookings);
module.exports = router;
