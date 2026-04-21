const express = require("express");
const router = express.Router();

const controller = require("../controllers/datSan.controller");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/role.middleware");

// ==========================================
// NHÓM 1: PUBLIC & TRA CỨU (Ai cũng có thể dùng)
// ==========================================

// Tìm kiếm sân (Thường dùng cho trang chủ/trang tìm kiếm)
router.get("/search", controller.searchSan);

// Kiểm tra các ô giờ trống của 1 sân cụ thể theo ngày
// Dùng để render "ma trận" xanh/đỏ trên giao diện
router.get("/check-available", controller.checkAvailableSlots);


// ==========================================
// NHÓM 2: DÀNH CHO KHÁCH HÀNG (Cần Login)
// ==========================================

// Đặt sân mới (POST /api/dat-san)
router.post("/", auth, controller.createBooking);

// Xem lại các đơn đã đặt của chính mình
router.get("/my-history", auth, controller.getMyHistory);

// Xem chi tiết 1 đơn đặt sân cụ thể (Dùng cho trang hóa đơn/chi tiết đơn)
//router.get("/:id", auth, controller.getBookingDetail);

// Khách hàng tự hủy đơn (Lưu ý: Chỉ cho phép khi trạng thái là 'cho_xac_nhan')
//router.put("/cancel/:id", auth, controller.userCancelBooking);


// ==========================================
// NHÓM 3: DÀNH CHO CHỦ SÂN (Cần Login & Quyền ChuSan)
// ==========================================

// Lấy danh sách tất cả các yêu cầu đặt sân mà khách gửi đến các sân mình sở hữu
//router.get("/owner/manage", auth, role(["ChuSan"]), controller.getOwnerBookings);

// Chủ sân xác nhận 'da_xac_nhan' hoặc từ chối 'da_huy' đơn của khách
//router.put("/owner/status/:id", auth, role(["ChuSan"]), controller.updateStatus);


module.exports = router;