const express = require("express");
const router = express.Router();

const controller = require("../controllers/sanController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/role.middleware");

// CRUD
router.post("/", auth, role("ChuSan"), controller.createSan);
router.get("/", auth, role("ChuSan"), controller.getMySan);
router.get("/:id", auth, controller.getSanDetail);
router.put("/:id", auth, role("ChuSan"), controller.updateSan);
router.delete("/:id", auth, role("ChuSan"), controller.deleteSan);

module.exports = router;