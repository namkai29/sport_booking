const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/role.middleware");

// đăng ký
router.post("/register", authController.register);

// đăng nhập
router.post("/login", authController.login);

// test user login
router.get("/me", authMiddleware, (req, res) => {
    res.json(req.user);
});

// test phân quyền (chỉ admin)
router.get(
    "/admin",
    authMiddleware,
    roleMiddleware(["Admin"]),
    (req, res) => {
        res.json({ message: "Hello Admin" });
    }
);

module.exports = router;