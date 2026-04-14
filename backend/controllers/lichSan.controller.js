const db = require("../config/db");
const Model = require("../models/lichSan.model");

// ======================
// BULK CREATE
// ======================
exports.createBulk = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { sanId, ngay, list } = req.body;

        if (!sanId || !ngay || !Array.isArray(list)) {
            return res.status(400).json({ message: "Thiếu dữ liệu" });
        }

        // 1. Kiểm tra quyền sở hữu sân
        const san = await Model.checkOwnerSan(sanId, req.user.id);
        if (!san) {
            return res.status(403).json({ message: "Không có quyền" });
        }

        // 2. [BƯỚC QUAN TRỌNG] Xóa hết lịch cũ của ngày hôm đó để ghi đè dữ liệu mới
        // Điều này giúp giải quyết việc bạn chuyển từ Đóng/Mở về lại "Chưa thiết lập"
        await connection.execute(
            `DELETE FROM LichSan WHERE sanId = ? AND ngay = ?`,
            [sanId, ngay]
        );

        let success = [];
        let failed = [];

        // 3. Tiến hành Insert các khung giờ được gửi lên
        for (const item of list) {
            const { khungGioId, trangThai } = item;

            try {
                if (!khungGioId || !trangThai) {
                    throw new Error("Dữ liệu sai");
                }

                if (!["Mo", "Dong", "BaoTri"].includes(trangThai)) {
                    throw new Error("Trạng thái không hợp lệ");
                }

                const isValidKhung = await Model.checkKhungGio(khungGioId);
                if (!isValidKhung) {
                    throw new Error("Khung giờ không tồn tại");
                }

                // Không cần check trùng nữa vì bước 2 đã xóa sạch sẽ dữ liệu cũ của ngày này rồi
                await connection.execute(
                    `INSERT INTO LichSan (sanId, khungGioId, ngay, trangThai)
                     VALUES (?, ?, ?, ?)`,
                    [sanId, khungGioId, ngay, trangThai]
                );

                success.push(item);

            } catch (err) {
                failed.push({ ...item, reason: err.message });
            }
        }

        await connection.commit();

        res.json({
            message: "Cập nhật thời gian biểu thành công",
            successCount: success.length,
            failCount: failed.length,
            success,
            failed
        });

    } catch (err) {
        await connection.rollback();
        console.error("Lỗi bulk lịch:", err);
        res.status(500).json({ message: "Lỗi hệ thống khi lưu lịch" });
    } finally {
        connection.release();
    }
};

// ======================
// GET LỊCH
// ======================
exports.getBySan = async (req, res) => {
    const data = await Model.getBySan(req.params.sanId);
    res.json(data);
};

// ======================
// UPDATE
// ======================
exports.updateTrangThai = async (req, res) => {
    const { trangThai } = req.body;

    if (!["Mo", "Dong", "BaoTri"].includes(trangThai)) {
        return res.status(400).json({ message: "Sai trạng thái" });
    }

    await Model.updateTrangThai(req.params.id, trangThai);

    res.json({ message: "Cập nhật thành công" });
};

// ======================
// DELETE
// ======================
exports.deleteLich = async (req, res) => {
    await Model.deleteLich(req.params.id);
    res.json({ message: "Xóa thành công" });
};