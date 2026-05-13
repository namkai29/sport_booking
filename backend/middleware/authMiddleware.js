const jwt = require("jsonwebtoken");
require("../config/env");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const token = authHeader.split(" ")[1];

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: "JWT_SECRET chưa được cấu hình" });
    }

    try {
        const decoded = jwt.verify(
            token,
            jwtSecret
        );

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token không hợp lệ" });
    }
};