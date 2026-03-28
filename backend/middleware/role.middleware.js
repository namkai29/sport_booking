exports.isOwner = (req, res, next) => {

    // kiểm tra user có tồn tại không
    if (!req.user) {
        return res.status(401).json({
            message: "Chưa xác thực người dùng"
        });
    }

    // kiểm tra role
    if (req.user.role !== "ChuSan") {
        return res.status(403).json({
            message: "Bạn không có quyền truy cập chức năng này"
        });
    }

    next();
};