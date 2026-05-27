const crypto = require("crypto");

function getConfig() {
    return {
        tmnCode: (process.env.VNPAY_TMN_CODE || "").trim(),
        hashSecret: (process.env.VNPAY_HASH_SECRET || "").trim(),
        paymentUrl: (process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html").trim(),
        returnPath: process.env.VNPAY_RETURN_PATH || "/frontend/payment-result.html",
        appBaseUrl: (process.env.APP_BASE_URL || "http://localhost:5000").replace(/\/$/, ""),
        version: "2.1.0",
    };
}

function isPlaceholder(value) {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return true;
    return v.startsWith("your_") || v.includes("example") || v.includes("placeholder");
}

function isConfigured() {
    const cfg = getConfig();
    return (
        !isPlaceholder(cfg.tmnCode) &&
        !isPlaceholder(cfg.hashSecret) &&
        cfg.tmnCode.length >= 4 &&
        cfg.hashSecret.length >= 8
    );
}

function getUnavailableMessage() {
    return "VNPay chưa được cấu hình. Đăng ký sandbox tại sandbox.vnpayment.vn và thêm VNPAY_TMN_CODE, VNPAY_HASH_SECRET vào backend/.env.";
}

/** VNPay yêu cầu: tiếng Việt không dấu, không ký tự đặc biệt (# : / ...) */
function sanitizeOrderInfo(text) {
    const cleaned = String(text || "Thanh toan dat san")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 255);
    return cleaned || "Thanh toan dat san";
}

/** Thời gian GMT+7 định dạng yyyyMMddHHmmss */
function formatVnpDate(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || "00";
    return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

function normalizeIp(ip) {
    const value = String(ip || "127.0.0.1").trim();
    if (value === "::1" || value === "::ffff:127.0.0.1" || value.startsWith("::")) {
        return "127.0.0.1";
    }
    if (value.includes(":")) {
        return "127.0.0.1";
    }
    return value.slice(0, 45);
}

function sortObject(obj) {
    return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined && value !== null && value !== "") {
                acc[key] = String(value);
            }
            return acc;
        }, {});
}

/** Giống code mẫu PHP chính thức của VNPay */
function buildSignedQuery(params, hashSecret) {
    const sorted = sortObject(params);
    let query = "";
    let hashdata = "";
    let index = 0;

    for (const key of Object.keys(sorted)) {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(sorted[key]).replace(/%20/g, "+");

        if (index > 0) {
            hashdata += `&${encodedKey}=${encodedValue}`;
        } else {
            hashdata = `${encodedKey}=${encodedValue}`;
            index = 1;
        }
        query += `${encodedKey}=${encodedValue}&`;
    }

    const secureHash = crypto.createHmac("sha512", hashSecret).update(hashdata, "utf8").digest("hex");
    query += `vnp_SecureHash=${secureHash}`;

    return { query, secureHash };
}

function buildTxnRef(datSanId) {
    return `${datSanId}${Date.now()}`.slice(0, 32);
}

function parseDatSanIdFromTxnRef(txnRef) {
    const digits = String(txnRef || "").replace(/\D/g, "");
    if (!digits) return null;
    const match = digits.match(/^(\d+)/);
    return match ? Number(match[1]) : null;
}

function createPaymentUrl({ datSanId, amount, orderInfo, ipAddr }) {
    if (!isConfigured()) {
        throw new Error(getUnavailableMessage());
    }

    const cfg = getConfig();
    const txnRef = buildTxnRef(datSanId);
    const now = new Date();
    const expire = new Date(now.getTime() + 15 * 60 * 1000);
    const amountVnd = Math.round(Number(amount));

    if (amountVnd < 1000) {
        throw new Error("Số tiền thanh toán không hợp lệ (tối thiểu 1.000đ)");
    }

    const vnpParams = {
        vnp_Version: cfg.version,
        vnp_Command: "pay",
        vnp_TmnCode: cfg.tmnCode,
        vnp_Amount: String(amountVnd * 100),
        vnp_CurrCode: "VND",
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: sanitizeOrderInfo(orderInfo || `Thanh toan dat san ${datSanId}`),
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: `${cfg.appBaseUrl}${cfg.returnPath}`,
        vnp_CreateDate: formatVnpDate(now),
        vnp_ExpireDate: formatVnpDate(expire),
        vnp_IpAddr: normalizeIp(ipAddr),
    };

    const { query } = buildSignedQuery(vnpParams, cfg.hashSecret);
    const payUrl = `${cfg.paymentUrl}?${query}`;

    return {
        payUrl,
        txnRef,
        amount: amountVnd,
    };
}

function verifySecureHash(query) {
    if (!isConfigured()) return false;

    const cfg = getConfig();
    const secureHash = query.vnp_SecureHash;
    if (!secureHash) return false;

    const params = { ...query };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const { secureHash: expected } = buildSignedQuery(params, cfg.hashSecret);
    return expected === secureHash;
}

function isPaymentSuccess(query) {
    return String(query.vnp_ResponseCode) === "00" && verifySecureHash(query);
}

module.exports = {
    isConfigured,
    getUnavailableMessage,
    createPaymentUrl,
    verifySecureHash,
    isPaymentSuccess,
    parseDatSanIdFromTxnRef,
    sanitizeOrderInfo,
};
