const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// ================= REGISTER =================
exports.register = async (req, res) => {
    try {
        const { ten, email, matKhau, role } = req.body;

        const existingUser = await User.findByEmail(email);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        const hashedPassword = await bcrypt.hash(matKhau, 10);

        await User.create({
            ten,
            email,
            matKhau: hashedPassword,
            role: role || "KhachHang"
        });

        res.json({ message: "Đăng ký thành công" });

    } catch (err) {
        res.status(500).json(err);
    }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
    try {
        const { email, matKhau } = req.body;

        const users = await User.findByEmail(email);

        if (users.length === 0) {
            return res.status(400).json({ message: "Email không tồn tại" });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(matKhau, user.matKhau);

        if (!isMatch) {
            return res.status(400).json({ message: "Sai mật khẩu" });
        }

        const token = jwt.sign(
            {
                id: user.nguoiDungId,
                role: user.role
            },
            process.env.JWT_SECRET || "SECRET_KEY",
            { expiresIn: "1d" }
        );

        res.json({
            message: "Đăng nhập thành công",
            token,
            user: {
                id: user.nguoiDungId,
                ten: user.ten,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).json(err);
    }
};