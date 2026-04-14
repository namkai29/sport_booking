const db = require("../config/db");

const User = {
    findByEmail: async (email) => {
        const [rows] = await db.execute(
            "SELECT * FROM NguoiDung WHERE email = ?",
            [email]
        );
        return rows;
    },

    create: async (user) => {
        const [result] = await db.execute(
            "INSERT INTO NguoiDung (ten, email, matKhau, role) VALUES (?, ?, ?, ?)",
            [user.ten, user.email, user.matKhau, user.role]
        );
        return result;
    }
};

module.exports = User;