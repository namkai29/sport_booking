const urlParams = new URLSearchParams(window.location.search);
const vnpResponseCode = urlParams.get('vnp_ResponseCode');
const vnpTxnRef = urlParams.get('vnp_TxnRef');

let datSanId = urlParams.get('bookingId') || urlParams.get('datSanId');

const token = localStorage.getItem('token');
let pollAttempts = 0;
const MAX_POLL = 12;
const isVnpayReturn = Boolean(vnpTxnRef || vnpResponseCode);

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        setResult('fail', 'Cần đăng nhập', 'Vui lòng đăng nhập để xem kết quả thanh toán.');
        document.getElementById('retryBtn').style.display = 'none';
        return;
    }

    if (!datSanId && !isVnpayReturn) {
        setResult('fail', 'Không tìm thấy đơn', 'Thiếu mã đơn đặt sân trong liên kết quay về.');
        return;
    }

    if (isVnpayReturn) {
        await processVnpayReturn();
        return;
    }

    if (datSanId) {
        pollPaymentStatus();
    }
});

async function processVnpayReturn() {
    setResult('pending', 'Đang xác nhận VNPay...', 'Hệ thống đang kiểm tra kết quả thanh toán.');

    const query = window.location.search;
    try {
        const res = await fetch(`/api/payments/vnpay/return${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể xác nhận thanh toán VNPay');

        datSanId = data.datSanId || datSanId;
        await loadPaymentDetails();

        if (data.success) {
            setResult('success', 'Thanh toán thành công!', data.message || 'Đơn đã được ghi nhận thanh toán qua VNPay.');
            document.getElementById('retryBtn').style.display = 'none';
            return;
        }

        setResult('fail', 'Thanh toán chưa thành công', data.message || 'Giao dịch VNPay chưa hoàn tất.');
        document.getElementById('retryBtn').style.display = 'inline-flex';
    } catch (err) {
        setResult('fail', 'Lỗi xác nhận VNPay', err.message);
        document.getElementById('retryBtn').style.display = 'inline-flex';
    }
}

async function pollPaymentStatus() {
    pollAttempts += 1;
    setResult('pending', 'Đang xác nhận thanh toán...', `Đang kiểm tra trạng thái (${pollAttempts}/${MAX_POLL})...`);

    try {
        const res = await fetch(`/api/payments/${datSanId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể lấy trạng thái thanh toán');

        renderDetails(data);

        if (data.paid || data.depositPaid) {
            setResult(
                'success',
                'Cọc online thành công!',
                `Đã cọc 30% (${Number(data.tienCoc || data.soTien || 0).toLocaleString('vi-VN')}đ). Còn ${Number(data.conLaiTaiSan || 0).toLocaleString('vi-VN')}đ thanh toán tại sân.`
            );
            document.getElementById('retryBtn').style.display = 'none';
            return;
        }

        if (pollAttempts < MAX_POLL) {
            setTimeout(pollPaymentStatus, 2000);
            return;
        }

        setResult(
            'pending',
            'Đang chờ xác nhận',
            'Thanh toán có thể đã gửi nhưng chưa đồng bộ. Hãy kiểm tra lại sau vài phút trong lịch sử đặt sân.'
        );
        document.getElementById('retryBtn').style.display = 'inline-flex';
    } catch (err) {
        setResult('fail', 'Lỗi kiểm tra trạng thái', err.message);
        document.getElementById('retryBtn').style.display = 'inline-flex';
    }
}

function renderDetails(data) {
    const details = document.getElementById('resultDetails');
    details.innerHTML = `
        <div><span>Mã đơn</span><strong>#${escapeHtml(String(data.datSanId))}</strong></div>
        <div><span>Tổng tiền sân</span><strong>${Number(data.tongTien || 0).toLocaleString('vi-VN')}đ</strong></div>
        <div><span>Tiền cọc (30%)</span><strong>${Number(data.tienCoc || data.soTien || 0).toLocaleString('vi-VN')}đ</strong></div>
        <div><span>Còn tại sân</span><strong>${Number(data.conLaiTaiSan || 0).toLocaleString('vi-VN')}đ</strong></div>
        <div><span>Trạng thái</span><strong>${escapeHtml(getPaymentStatusText(data.trangThaiTT))}</strong></div>
        <div><span>Mã giao dịch</span><strong>${escapeHtml(data.maGiaoDich || '-')}</strong></div>
    `;
}

async function loadPaymentDetails() {
    if (!datSanId) return;
    try {
        const res = await fetch(`/api/payments/${datSanId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) renderDetails(data);
    } catch {
        // ignore
    }
}

function setResult(type, title, message) {
    const icon = document.getElementById('resultIcon');
    icon.className = `result-icon ${type}`;
    if (type === 'success') {
        icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else if (type === 'fail') {
        icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    } else {
        icon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }
    document.getElementById('resultTitle').innerText = title;
    document.getElementById('resultMessage').innerText = message;
}

function getPaymentStatusText(status) {
    const labels = {
        chua_thanh_toan: 'Chưa cọc online',
        cho_thanh_toan: 'Đang chờ cọc',
        da_thanh_toan: 'Đã cọc 30% online'
    };
    return labels[status] || status || 'Không rõ';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
