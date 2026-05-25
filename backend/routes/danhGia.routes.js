const express = require("express");
const router = express.Router();
 
const controller = require("../controllers/danhGia.controller");
const auth = require("../middleware/authMiddleware");
 
router.get("/court/:sanId", controller.getCourtReviews);
router.get("/court/:sanId/my-eligibility", auth, controller.getMyReviewEligibility);
router.post("/court/:sanId", auth, controller.createReview);
 
module.exports = router;