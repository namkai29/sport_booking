const db = require("../config/db");

// ======================
// CHECK SÂN CÓ PHẢI CỦA CHỦ
// ======================
const checkOwnerSan = async (sanId, userId) => {
    const [rows] = await db.execute(
        "SELECT * FROM San WHERE sanId = ? AND chuSanId = ?",
        [sanId, userId]
    );
    return rows[0];
};

// ======================
// CHECK KHUNG GIỜ
// ======================
const checkKhungGio = async (khungGioId) => {
    const [rows] = await db.execute(
        "SELECT * FROM KhungGio WHERE khungGioId = ?",
        [khungGioId]
    );
    return rows.length > 0;
};

// ======================
// CHECK TRÙNG
// ======================
const checkTrungGia = async (sanId, khungGioId, thu) => {
    const [rows] = await db.execute(
        `SELECT * FROM GiaSan
         WHERE sanId=? AND khungGioId=? AND thuTrongTuan=?`,
        [sanId, khungGioId, thu]
    );
    return rows.length > 0;
};

// ======================
// GET GIÁ
// ======================
const getGiaBySan = async (sanId) => {
    const [rows] = await db.execute(
        `SELECT g.*, k.gioBatDau, k.gioKetThuc
         FROM GiaSan g
         JOIN KhungGio k ON g.khungGioId = k.khungGioId
         WHERE g.sanId = ?
         ORDER BY thuTrongTuan, gioBatDau`,
        [sanId]
    );
    return rows;
};

// ======================
// UPDATE
// ======================
const updateGia = async (id, gia) => {
    await db.execute(
        "UPDATE GiaSan SET gia=? WHERE giaSanId=?",
        [gia, id]
    );
};

// ======================
// DELETE
// ======================
const deleteGia = async (id) => {
    await db.execute(
        "DELETE FROM GiaSan WHERE giaSanId=?",
        [id]
    );
};

module.exports = {
    checkOwnerSan,
    checkKhungGio,
    checkTrungGia,
    getGiaBySan,
    updateGia,
    deleteGia
};