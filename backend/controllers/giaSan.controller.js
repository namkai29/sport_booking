const db = require("../config/db");
const GiaModel = require("../models/giaSan.model");

// ======================
// BULK CREATE (PRO)
// ======================
exports.createBulkGia = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { sanId, list } = req.body;

        if (!sanId || !Array.isArray(list) || list.length === 0) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
        }

        // check quyền
        const san = await GiaModel.checkOwnerSan(sanId, req.user.id);
        if (!san) {
            return res.status(403).json({ message: "Không có quyền" });
        }

        let success = [];
        let failed = [];

        for (const item of list) {
            let { khungGioId, thuTrongTuan, gia } = item;

            try {
                // validate
                if (!khungGioId || !thuTrongTuan || !gia || gia <= 0) {
                    throw new Error("Dữ liệu sai");
                }

                if (thuTrongTuan < 2 || thuTrongTuan > 8) {
                    throw new Error("Thứ không hợp lệ");
                }

                // check khung giờ
                const isValidKhung = await GiaModel.checkKhungGio(khungGioId);
                if (!isValidKhung) {
                    throw new Error("Khung giờ không tồn tại");
                }

                //  auto weekend
                if (thuTrongTuan === 7 || thuTrongTuan === 8) {
                    gia = Math.round(gia * 1.2);
                }

                const isTrung = await GiaModel.checkTrungGia(
                sanId,
                khungGioId,
                thuTrongTuan
                );

                if (isTrung) {
                    // Nếu đã tồn tại -> Thực hiện UPDATE giá mới
                    await connection.execute(
                        `UPDATE GiaSan 
                        SET gia = ? 
                        WHERE sanId = ? AND khungGioId = ? AND thuTrongTuan = ?`,
                        [gia, sanId, khungGioId, thuTrongTuan]
                    );
                    success.push({ khungGioId, thuTrongTuan, gia, status: "updated" });
                } else {
                    // Nếu chưa có -> Thực hiện INSERT mới
                    await connection.execute(
                        `INSERT INTO GiaSan (sanId, khungGioId, thuTrongTuan, gia)
                        VALUES (?, ?, ?, ?)`,
                        [sanId, khungGioId, thuTrongTuan, gia]
                    );
                    success.push({ khungGioId, thuTrongTuan, gia, status: "inserted" });
                }

            } catch (err) {
                failed.push({ ...item, reason: err.message });
            }
        }

        await connection.commit();

        res.json({
            message: "Thêm giá hàng loạt hoàn tất",
            successCount: success.length,
            failCount: failed.length,
            success,
            failed
        });

    } catch (err) {
        await connection.rollback();
        res.status(500).json(err);
    } finally {
        connection.release();
    }
};

// ======================
// GET GIÁ
// ======================
exports.getGiaBySan = async (req, res) => {
    const data = await GiaModel.getGiaBySan(req.params.sanId);
    res.json(data);
};

// ======================
// UPDATE GIÁ
// ======================
exports.updateGia = async (req, res) => {
    const { gia } = req.body;

    if (!gia || gia <= 0) {
        return res.status(400).json({ message: "Giá không hợp lệ" });
    }

    await GiaModel.updateGia(req.params.id, gia);

    res.json({ message: "Cập nhật giá thành công" });
};

// ======================
// DELETE GIÁ
// ======================
exports.deleteGia = async (req, res) => {
    await GiaModel.deleteGia(req.params.id);
    res.json({ message: "Xóa giá thành công" });
};