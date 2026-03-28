const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(403).json({
            message: "Không có token"
        });
    }

    const token = authHeader.split(" ")[1]; // tách Bearer

    jwt.verify(token, "SECRET_KEY", (err, decoded) => {

        if (err) {
            return res.status(401).json({
                message: "Token không hợp lệ"
            });
        }

        req.user = decoded;

        next();
    });

};