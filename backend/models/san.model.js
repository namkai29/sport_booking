const db = require("../config/db")

const San = {

    // lấy tất cả sân
    getAll: async () => {
        const [rows] = await db.execute(
            "SELECT * FROM San"
        )
        return rows
    },

    // lấy sân theo chủ sân
    getByOwner: async (chuSanId) => {
        const [rows] = await db.execute(
            "SELECT * FROM San WHERE chuSanId=?",
            [chuSanId]
        )
        return rows
    },

    // thêm sân
    create: async (data) => {

        const { chuSanId, tenSan, kieuSan, diaChi, giaThue } = data

        const [result] = await db.execute(
            `INSERT INTO San 
            (chuSanId, tenSan, kieuSan, diaChi, giaThue, tinhTrang)
            VALUES (?, ?, ?, ?, ?, 'Hoạt động')`,
            [chuSanId, tenSan, kieuSan, diaChi, giaThue]
        )

        return result
    },

    // cập nhật sân
    update: async (sanId, data) => {

        const { tenSan, kieuSan, diaChi, giaThue } = data

        const [result] = await db.execute(
            `UPDATE San
             SET tenSan=?, kieuSan=?, diaChi=?, giaThue=?
             WHERE sanId=?`,
            [tenSan, kieuSan, diaChi, giaThue, sanId]
        )

        return result
    },

    // ngừng hoạt động sân
    delete: async (sanId) => {

        const [result] = await db.execute(
            "UPDATE San SET tinhTrang='Ngừng hoạt động' WHERE sanId=?",
            [sanId]
        )

        return result
    }

}

module.exports = San