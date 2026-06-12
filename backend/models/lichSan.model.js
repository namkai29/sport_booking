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
const checkKhungGio = async (khungGioId, sanId) => {
    const [rows] = await db.execute(
        `SELECT * FROM KhungGio
         WHERE khungGioId = ?
         AND (sanId = ? OR sanId IS NULL)`,
        [khungGioId, sanId]
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


const getLichOwner = async (id, userId) => {
    const [rows] = await db.execute(
        `SELECT l.lichSanId
         FROM LichSan l
         JOIN San s ON l.sanId = s.sanId
         WHERE l.lichSanId = ? AND s.chuSanId = ?`,
        [id, userId]
    );
    return rows[0];
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

// ======================
// KHUNG GIỜ THEO SÂN
// ======================
const getKhungGioBySan = async (sanId) => {
    const [venueSlots] = await db.execute(
        `SELECT khungGioId, sanId, gioBatDau, gioKetThuc
         FROM KhungGio WHERE sanId = ?
         ORDER BY gioBatDau ASC`,
        [sanId]
    );
    if (venueSlots.length > 0) return venueSlots;

    const [globalSlots] = await db.execute(
        `SELECT khungGioId, sanId, gioBatDau, gioKetThuc
         FROM KhungGio WHERE sanId IS NULL
         ORDER BY gioBatDau ASC`
    );
    return globalSlots;
};

const getKhungGioOwner = async (khungGioId, sanId, userId) => {
    const [rows] = await db.execute(
        `SELECT kg.*
         FROM KhungGio kg
         JOIN San s ON kg.sanId = s.sanId
         WHERE kg.khungGioId = ? AND kg.sanId = ? AND s.chuSanId = ?`,
        [khungGioId, sanId, userId]
    );
    return rows[0];
};

const createKhungGioSan = async (sanId, gioBatDau, gioKetThuc) => {
    const [result] = await db.execute(
        `INSERT INTO KhungGio (sanId, gioBatDau, gioKetThuc) VALUES (?, ?, ?)`,
        [sanId, gioBatDau, gioKetThuc]
    );
    return result.insertId;
};

const deleteKhungGioSan = async (khungGioId, sanId) => {
    await db.execute(
        `DELETE FROM KhungGio WHERE khungGioId = ? AND sanId = ?`,
        [khungGioId, sanId]
    );
};

const copyDefaultKhungGio = async (sanId) => {
    const [existing] = await db.execute(
        "SELECT COUNT(*) AS cnt FROM KhungGio WHERE sanId = ?",
        [sanId]
    );
    if (existing[0].cnt > 0) return 0;

    const [globals] = await db.execute(
        "SELECT gioBatDau, gioKetThuc FROM KhungGio WHERE sanId IS NULL ORDER BY gioBatDau"
    );
    for (const slot of globals) {
        await db.execute(
            "INSERT INTO KhungGio (sanId, gioBatDau, gioKetThuc) VALUES (?, ?, ?)",
            [sanId, slot.gioBatDau, slot.gioKetThuc]
        );
    }
    return globals.length;
};

module.exports = {
    checkOwnerSan,
    checkKhungGio,
    checkTrung,
    getBySan,
    getLichOwner,
    updateTrangThai,
    deleteLich,
    getKhungGioBySan,
    getKhungGioOwner,
    createKhungGioSan,
    deleteKhungGioSan,
    copyDefaultKhungGio
};