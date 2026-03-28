const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {

    const { ten, email, matKhau, phone, role } = req.body;

    try {

        const hashedPassword = await bcrypt.hash(matKhau, 10);

        const sql = `
        INSERT INTO NguoiDung(ten,email,matKhau,phone,role)
        VALUES (?,?,?,?,?)
        `;

        await db.execute(sql, [ten, email, hashedPassword, phone, role]);

        res.json({
            message: "Đăng ký thành công"
        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

};

exports.login = async (req, res) => {

    const { email, matKhau } = req.body;

    try {

        const sql = "SELECT * FROM NguoiDung WHERE email=?";

        const [rows] = await db.execute(sql, [email]);

        if (rows.length === 0) {
            return res.status(400).json({
                message: "Email không tồn tại"
            });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(matKhau, user.matKhau);

        if (!isMatch) {
            return res.status(400).json({
                message: "Sai mật khẩu"
            });
        }

        const token = jwt.sign(
            {
                id: user.nguoiDungId,
                role: user.role
            },
            "SECRET_KEY",
            { expiresIn: "1d" }
        );

        res.json({
            message: "Đăng nhập thành công",
            token,
            user
        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

};