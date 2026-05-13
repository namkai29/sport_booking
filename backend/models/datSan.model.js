const db = require("../config/db");

const DatSanModel = {
    // 1. Kiểm tra xem khung giờ đó có được mở (Mo) không
    checkSanSang: async (sanId, ngay, khungGioId) => {
        const [rows] = await db.execute(
            "SELECT trangThai FROM LichSan WHERE sanId=? AND ngay=? AND khungGioId=?",
            [sanId, ngay, khungGioId]
        );
        return rows.length > 0 && rows[0].trangThai === 'Mo';
    },

    // 2. Kiểm tra xem đã có đơn đặt nào thành công/chờ xác nhận chưa
    checkTrungLich: async (sanId, ngay, khungGioId) => {
        const [rows] = await db.execute(
            `SELECT * FROM DatSan 
             WHERE sanId=? AND ngayDat=? AND khungGioId=? 
             AND trangThai IN ('cho_xac_nhan', 'da_xac_nhan', 'hoan_thanh')`,
            [sanId, ngay, khungGioId]
        );
        return rows.length > 0;
    },

    // 3. Lấy giá tiền thực tế từ bảng GiaSan
    getGiaTien: async (sanId, khungGioId, thuTrongTuan) => {
        const [rows] = await db.execute(
            "SELECT gia FROM GiaSan WHERE sanId=? AND khungGioId=? AND thuTrongTuan=?",
            [sanId, khungGioId, thuTrongTuan]
        );
        return rows.length > 0 ? rows[0].gia : null;
    }
};

module.exports = DatSanModel;