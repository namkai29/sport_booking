const db = require("../config/db");

// =====================
// CHECK LOẠI SÂN
// =====================
const checkLoaiSan = async (connection, loaiSanId) => {
    const [rows] = await connection.execute(
        "SELECT loaiSanId FROM LoaiSan WHERE loaiSanId = ?",
        [loaiSanId]
    );
    return rows.length > 0;
};

// =====================
// CHECK TRÙNG
// =====================
const checkTrungSan = async (connection, data, chuSanId) => {
    const {
        tenSan,
        tinhThanh,
        quanHuyen,
        phuongXa,
        diaChiChiTiet
    } = data;

    const [rows] = await connection.execute(
        `SELECT s.sanId
         FROM San s
         JOIN DiaChi d ON s.diaChiId = d.diaChiId
         WHERE s.chuSanId = ?
         AND s.tenSan = ?
         AND d.tinhThanh = ?
         AND d.quanHuyen = ?
         AND d.phuongXa = ?
         AND d.diaChiChiTiet = ?`,
        [chuSanId, tenSan, tinhThanh, quanHuyen, phuongXa, diaChiChiTiet]
    );

    return rows.length > 0;
};

// =====================
// CREATE
// =====================
const createDiaChi = async (connection, data) => {
    const [result] = await connection.execute(
        // Thêm viDo, kinhDo vào đây và thêm 2 dấu hỏi
        `INSERT INTO DiaChi (tinhThanh, quanHuyen, phuongXa, diaChiChiTiet, viDo, kinhDo)
         VALUES (?, ?, ?, ?, ?, ?)`, 
        [
            data.tinhThanh,
            data.quanHuyen,
            data.phuongXa,
            data.diaChiChiTiet,
            data.viDo || null,  // Giá trị thứ 5
            data.kinhDo || null // Giá trị thứ 6
        ]
    );
    return result.insertId;
};

const createSan = async (connection, data, diaChiId, chuSanId) => {
    const [result] = await connection.execute(
        `INSERT INTO San 
        (tenSan, moTa, hinhAnh, loaiSanId, diaChiId, chuSanId)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            data.tenSan,
            data.moTa,
            data.hinhAnh,
            data.loaiSanId,
            diaChiId,
            chuSanId
        ]
    );
    return result.insertId;
};

// =====================
// GET ALL (theo chủ sân)
// =====================
const getAllByOwner = async (chuSanId) => {
    const [rows] = await db.execute(
        `SELECT s.*, l.tenLoai, d.*
         FROM San s
         JOIN LoaiSan l ON s.loaiSanId = l.loaiSanId
         JOIN DiaChi d ON s.diaChiId = d.diaChiId
         WHERE s.chuSanId = ?`,
        [chuSanId]
    );
    return rows;
};

// =====================
// GET ONE
// =====================
const getById = async (sanId) => {
    const [rows] = await db.execute(
        `SELECT s.*, l.tenLoai, d.*
         FROM San s
         JOIN LoaiSan l ON s.loaiSanId = l.loaiSanId
         JOIN DiaChi d ON s.diaChiId = d.diaChiId
         WHERE s.sanId = ?`,
        [sanId]
    );
    return rows[0];
};

// =====================
// UPDATE
// =====================
const updateSan = async (connection, sanId, data) => {
    await connection.execute(
        `UPDATE San 
         SET tenSan=?, moTa=?, hinhAnh=?, loaiSanId=?
         WHERE sanId=?`,
        [
            data.tenSan,
            data.moTa,
            data.hinhAnh,
            data.loaiSanId,
            sanId
        ]
    );
};

const updateDiaChi = async (connection, diaChiId, data) => {
    await connection.execute(
        `UPDATE DiaChi
         SET tinhThanh=?, quanHuyen=?, phuongXa=?, diaChiChiTiet=?, viDo=?, kinhDo=?
         WHERE diaChiId=?`,
        [
            data.tinhThanh,
            data.quanHuyen,
            data.phuongXa,
            data.diaChiChiTiet,
            data.viDo || null,
            data.kinhDo || null,
            diaChiId
        ]
    );
};

// =====================
// DELETE
// =====================
const deleteSan = async (sanId) => {
    await db.execute("DELETE FROM San WHERE sanId = ?", [sanId]);
};

module.exports = {
    checkLoaiSan,
    checkTrungSan,
    createDiaChi,
    createSan,
    getAllByOwner,
    getById,
    updateSan,
    updateDiaChi,
    deleteSan
};