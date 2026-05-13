module.exports = (roles) => {
    return (req, res, next) => {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Không có quyền truy cập" });
        }
        next();
    };
};