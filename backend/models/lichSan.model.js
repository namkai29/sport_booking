const db = require("../config/db");

// ======================
// CHECK SÂN CỦA CHỦ
// ======================
const checkOwnerSan = async (sanId, userId) => {
    const [rows] = await db.execute(
        "SELECT * FROM San WHERE sanId=? AND chuSanId=?",
        [sanId, userId]
    );
    return rows[0];
};

// ======================
// CHECK KHUNG GIỜ
// ======================
const checkKhungGio = async (khungGioId) => {
    const [rows] = await db.execute(
        "SELECT * FROM KhungGio WHERE khungGioId=?",
        [khungGioId]
    );
    return rows.length > 0;
};

// ======================
// CHECK TRÙNG
// ======================
const checkTrung = async (sanId, ngay, khungGioId) => {
    const [rows] = await db.execute(
        `SELECT * FROM LichSan
         WHERE sanId=? AND ngay=? AND khungGioId=?`,
        [sanId, ngay, khungGioId]
    );
    return rows.length > 0;
};

// ======================
// GET LỊCH (Đã sửa định dạng ngày)
// ======================
const getBySan = async (sanId) => {
    const [rows] = await db.execute(
        `SELECT 
            l.lichSanId, 
            l.sanId, 
            l.khungGioId, 
            DATE_FORMAT(l.ngay, '%Y-%m-%d') AS ngay, 
            l.trangThai,
            k.gioBatDau, 
            k.gioKetThuc
         FROM LichSan l
         JOIN KhungGio k ON l.khungGioId = k.khungGioId
         WHERE l.sanId = ?
         ORDER BY l.ngay, k.gioBatDau`,
        [sanId]
    );
    return rows;
};

// ======================
// UPDATE
// ======================
const updateTrangThai = async (id, trangThai) => {
    await db.execute(
        "UPDATE LichSan SET trangThai=? WHERE lichSanId=?",
        [trangThai, id]
    );
};

// ======================
// DELETE
// ======================
const deleteLich = async (id) => {
    await db.execute(
        "DELETE FROM LichSan WHERE lichSanId=?",
        [id]
    );
};

module.exports = {
    checkOwnerSan,
    checkKhungGio,
    checkTrung,
    getBySan,
    updateTrangThai,
    deleteLich
};