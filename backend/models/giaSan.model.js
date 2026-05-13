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

const getGiaOwner = async (id, userId) => {
    const [rows] = await db.execute(
        `SELECT g.giaSanId
         FROM GiaSan g
         JOIN San s ON g.sanId = s.sanId
         WHERE g.giaSanId = ? AND s.chuSanId = ?`,
        [id, userId]
    );
    return rows[0];
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
const deleteGiaBySanKhung = async (sanId, khungGioId, userId) => {
    const [result] = await db.execute(
        `DELETE g FROM GiaSan g
         JOIN San s ON g.sanId = s.sanId
         WHERE g.sanId = ? AND g.khungGioId = ? AND s.chuSanId = ?`,
        [sanId, khungGioId, userId]
    );
    return result.affectedRows;
};
module.exports = {
    checkOwnerSan,
    checkKhungGio,
    checkTrungGia,
    getGiaBySan,
    getGiaOwner,
    updateGia,
    deleteGia,
    deleteGiaBySanKhung
};