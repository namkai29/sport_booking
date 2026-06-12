document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Vui lòng đăng nhập để xem lịch sử đặt sân!');
        window.location.href = '/frontend/login.html';
        return;
    }

    if (typeof initCustomerLayout === 'function') {
        initCustomerLayout({ activePage: 'history' });
    }

    checkOnlinePaymentAvailable().then(loadBookingHistory);
});
 


let allBookings = [];
let pendingCancelBookingId = null;
let pendingPayment = null;
let onlinePaymentMethod = null;
let onlinePaymentAvailable = false;
const highlightedBookingId = new URLSearchParams(window.location.search).get('bookingId');

async function checkOnlinePaymentAvailable() {
    try {
        const res = await fetch('/api/payments/online/available');
        const data = await res.json();
        onlinePaymentAvailable = Boolean(data.anyAvailable);
        onlinePaymentMethod = data.default || null;
    } catch {
        onlinePaymentAvailable = false;
        onlinePaymentMethod = null;
    }
}

async function loadBookingHistory() {
    const status = document.getElementById('historyStatus');
    const list = document.getElementById('historyList');
    const token = localStorage.getItem('token');
 
    status.style.display = 'block';
    status.innerText = 'Đang tải lịch sử đặt sân...';
    list.innerHTML = '';
 
    try {
        const res = await fetch('/api/bookings/my-history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const bookings = await res.json();
 
        if (!res.ok) {
            throw new Error(bookings.message || 'Không thể tải lịch sử đặt sân');
        }
 
        allBookings = bookings;
        renderBookingHistory();
        handlePaymentReturn();
        scrollToHighlightedBooking();
    } catch (err) {
        status.className = 'error';
        status.innerText = err.message;
    }
}


function renderBookingHistory() {
    const status = document.getElementById('historyStatus');
    const list = document.getElementById('historyList');
    const filterValue = document.getElementById('historyFilter')?.value || 'all';
    const bookings = filterValue === 'all'
        ? allBookings
        : allBookings.filter(booking => booking.trangThai === filterValue);
 
    status.className = 'status';
    list.innerHTML = '';
 
    if (allBookings.length === 0) {
        status.style.display = 'block';
        status.innerText = 'Bạn chưa có đơn đặt sân nào.';
        return;
    }
 
    if (bookings.length === 0) {
        status.style.display = 'block';
        status.innerText = 'Không có đơn phù hợp với bộ lọc hiện tại.';
        return;
    }
 
    status.style.display = 'none';
    list.innerHTML = bookings.map(renderBookingCard).join('');
}
 
function renderBookingCard(booking) {
    const bookingDate = formatDate(booking.ngayDat);
    const canCancel = booking.trangThai === 'cho_xac_nhan';
    const canPayOnline = onlinePaymentAvailable
        && booking.phuongThuc === 'vnpay'
        && booking.trangThai !== 'da_huy'
        && booking.trangThaiTT !== 'da_thanh_toan';
    const bookingStatus = escapeHtml(getBookingStatusText(booking.trangThai));
    const paymentStatus = escapeHtml(getPaymentStatusText(booking.trangThaiTT, booking));
    const paymentSummary = escapeHtml(getPaymentSummary(booking));
    const isHighlighted = String(booking.datSanId) === highlightedBookingId;
 
    return `
        <article class="history-card ${isHighlighted ? 'highlighted' : ''}" data-booking-id="${booking.datSanId}" data-status="${escapeHtml(booking.trangThai)}" data-paid-online="${booking.trangThaiTT === 'da_thanh_toan' && booking.phuongThuc === 'vnpay'}">
            <div>
                <h3>${escapeHtml(booking.tenSan)} <small>#${booking.datSanId}</small></h3>
                <p><i class="fa-regular fa-calendar"></i> ${bookingDate}</p>
                <p><i class="fa-regular fa-clock"></i> ${String(booking.gioBatDau || '').slice(0, 5)} - ${String(booking.gioKetThuc || '').slice(0, 5)}</p>
                ${(booking.soLuong || 1) > 1 ? `<p><i class="fa-solid fa-layer-group"></i> ${booking.soLuong} sân</p>` : ''}
                <p><i class="fa-solid fa-money-bill-wave"></i> ${paymentSummary}</p>
            </div>
            <div class="history-actions">
                <span class="booking-status ${booking.trangThai}">${bookingStatus}</span>
                <span class="payment-status ${booking.trangThaiTT === 'da_thanh_toan' ? 'paid' : ''}">${paymentStatus}</span>
                <button class="btn-outline btn-small" onclick="openBookingDetail(${booking.datSanId})">Xem chi tiết</button>
                ${canPayOnline ? `<button class="btn-primary btn-small" onclick="openPaymentDialog(${booking.datSanId})"><i class="fa-solid fa-credit-card"></i> Cọc 30% VNPay</button>` : ''}
                ${canCancel ? `<button class="btn-cancel-booking" onclick="openCancelDialog(${booking.datSanId})">Hủy đơn</button>` : ''}
            </div>
            <div class="booking-progress" aria-label="Tiến trình đơn đặt sân">
                ${renderProgress(booking.trangThai)}
            </div>
            
        </article>
    `;
}

async function openBookingDetail(datSanId) {
    const token = localStorage.getItem('token');
    const content = document.getElementById('bookingDetailContent');
    content.innerHTML = '<p>Đang tải chi tiết đơn...</p>';
    document.getElementById('bookingDetailBackdrop').classList.add('show');
 
    try {
        const res = await fetch(`/api/bookings/${datSanId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const booking = await res.json();
 
        if (!res.ok) {
            throw new Error(booking.message || 'Không thể tải chi tiết đơn');
        }
 
        content.innerHTML = `
            <div><span>Mã đơn</span><strong>#${booking.datSanId}</strong></div>
            <div><span>Sân</span><strong>${escapeHtml(booking.tenSan)}</strong></div>
            <div><span>Ngày đặt</span><strong>${formatDate(booking.ngayDat)}</strong></div>
            <div><span>Khung giờ</span><strong>${String(booking.gioBatDau || '').slice(0, 5)} - ${String(booking.gioKetThuc || '').slice(0, 5)}</strong></div>
            <div><span>Số sân</span><strong>${booking.soLuong || 1} sân</strong></div>
            <div><span>Trạng thái đơn</span><strong>${escapeHtml(getBookingStatusText(booking.trangThai))}</strong></div>
            <div><span>Thanh toán</span><strong>${escapeHtml(getPaymentStatusText(booking.trangThaiTT, booking))}</strong></div>
            ${booking.phuongThuc === 'vnpay' ? `<div><span>Chi tiết tiền</span><strong>${escapeHtml(getPaymentSummary(booking))}</strong></div>` : ''}
            <div><span>Phương thức</span><strong>${escapeHtml(getPaymentMethodText(booking.phuongThuc))}</strong></div>
            <div><span>Tổng tiền sân</span><strong>${formatMoney(booking.tongTien)}đ</strong></div>
            ${booking.phuongThuc === 'vnpay' ? `<div><span>Tiền cọc (30%)</span><strong>${formatMoney(booking.soTien || Math.round((booking.tongTien || 0) * 0.3))}đ</strong></div>` : ''}
            ${booking.maGiaoDich ? `<div><span>Mã giao dịch</span><strong>${escapeHtml(booking.maGiaoDich)}</strong></div>` : ''}
        `;
    } catch (err) {
        content.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
}
 
function closeBookingDetail() {
    document.getElementById('bookingDetailBackdrop').classList.remove('show');
}

function getBookingStatusText(status) {
    const labels = {
        cho_xac_nhan: 'Chờ xác nhận',
        da_xac_nhan: 'Đã xác nhận',
        hoan_thanh: 'Hoàn thành',
        da_huy: 'Đã hủy'
    };
    return labels[status] || status;
}
 
function getPaymentStatusText(status, booking = {}) {
    if (booking.phuongThuc === 'vnpay') {
        const labels = {
            chua_thanh_toan: 'Chưa cọc online',
            cho_thanh_toan: 'Đang chờ cọc',
            da_thanh_toan: 'Đã cọc 30% online'
        };
        return labels[status] || 'Chưa cọc online';
    }
    const labels = {
        chua_thanh_toan: 'Chưa thanh toán',
        cho_thanh_toan: 'Chờ thanh toán',
        da_thanh_toan: 'Đã thanh toán'
    };
    return labels[status] || 'Chưa thanh toán';
}

function getPaymentMethodText(method) {
    const labels = {
        tai_san: 'Thanh toán tại sân',
        vnpay: 'Cọc 30% VNPay'
    };
    return labels[method] || 'Thanh toán tại sân';
}

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('vi-VN');
}

function getPaymentSummary(booking) {
    const total = Number(booking.tongTien || 0);
    if (booking.phuongThuc !== 'vnpay') {
        return `${formatMoney(total)}đ`;
    }
    const coc = Number(booking.soTien || Math.round(total * 0.3));
    const remain = Math.max(0, total - coc);
    return `Tổng ${formatMoney(total)}đ · Cọc ${formatMoney(coc)}đ · Còn tại sân ${formatMoney(remain)}đ`;
}

function openCancelDialog(datSanId) {
    pendingCancelBookingId = datSanId;
    document.getElementById('confirmBackdrop').classList.add('show');
    document.getElementById('confirmCancelBtn').onclick = () => cancelBooking(pendingCancelBookingId);
}
 
function closeCancelDialog() {
    pendingCancelBookingId = null;
    document.getElementById('confirmBackdrop').classList.remove('show');
}

 
async function cancelBooking(datSanId) {
    if (!datSanId) return;
    const token = localStorage.getItem('token');
    const button = document.getElementById('confirmCancelBtn');
    button.disabled = true;
    button.innerText = 'Đang hủy...';
 
    try {
        const res = await fetch(`/api/bookings/cancel/${datSanId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
 
        if (!res.ok) {
            throw new Error(data.message || 'Không thể hủy đơn đặt sân');
        }
 
        showToast(data.message || 'Đã hủy đơn đặt sân');
        closeCancelDialog();
        loadBookingHistory();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        button.disabled = false;
        button.innerText = 'Hủy đơn';
    }
    
}


async function openPaymentDialog(datSanId) {
    const booking = allBookings.find(item => item.datSanId === datSanId);
    if (!booking) return;

    const token = localStorage.getItem('token');
    const content = document.getElementById('paymentContent');
    const confirmButton = document.getElementById('confirmPaymentBtn');
    pendingPayment = null;
    document.getElementById('paymentBackdrop').classList.add('show');
    content.innerHTML = '<p>Đang tạo phiên thanh toán...</p>';
    confirmButton.disabled = true;

    try {
        const res = await fetch(`/api/payments/${datSanId}/start-online`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phuongThuc: 'vnpay' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tạo phiên thanh toán');
        pendingPayment = data.payment;
        content.innerHTML = `
            <div><span>Mã đơn</span><strong>#${datSanId}</strong></div>
            <div><span>Sân</span><strong>${escapeHtml(booking.tenSan)}</strong></div>
            <div><span>Tổng tiền sân</span><strong>${formatMoney(data.payment.tongTien || booking.tongTien)}đ</strong></div>
            <div><span>Tiền cọc (30%)</span><strong>${formatMoney(data.payment.tienCoc || data.payment.soTien)}đ</strong></div>
            <div><span>Còn lại tại sân</span><strong>${formatMoney(data.payment.conLaiTaiSan)}đ</strong></div>
            <div><span>Mã giao dịch</span><strong>${escapeHtml(data.payment.maGiaoDich)}</strong></div>
        `;
        confirmButton.disabled = !data.payment?.payUrl;
        confirmButton.onclick = () => {
            if (pendingPayment?.payUrl) {
                window.location.href = pendingPayment.payUrl;
            }
        };
    } catch (err) {
        content.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
        confirmButton.disabled = true;
    }
}
 
function closePaymentDialog() {
    document.getElementById('paymentBackdrop').classList.remove('show');
    pendingPayment = null;
}
 

function renderProgress(status) {
    if (status === 'da_huy') {
        return `
            <span class="progress-step cancelled"></span>
            <span class="progress-step cancelled"></span>
            <span class="progress-step cancelled"></span>
        `;
    }
    const activeCount = {
        cho_xac_nhan: 1,
        da_xac_nhan: 2,
        hoan_thanh: 3
    }[status] || 1;
 
    return [1, 2, 3].map(step => (
        `<span class="progress-step ${step <= activeCount ? 'active' : ''}"></span>`
    )).join('');
}
 

function scrollToHighlightedBooking() {
    if (!highlightedBookingId) return;
    const bookingCard = document.querySelector(`[data-booking-id="${CSS.escape(highlightedBookingId)}"]`);
    if (!bookingCard) return;
    bookingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (bookingCard.dataset.paidOnline === "true" && bookingCard.dataset.status === "da_xac_nhan") {
        showToast('Thanh toán online thành công. Đơn đã được tự động xác nhận.');
        return;
    }
    showToast('Đặt sân thành công. Đơn của bạn đang chờ chủ sân xác nhận.');
}

function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('vnp_ResponseCode')) return;
 
    const success = params.get('vnp_ResponseCode') === '00'
        && params.get('vnp_TransactionStatus') === '00';
    showToast(
        success
            ? 'Thanh toán online thành công. Đơn đã tự động xác nhận.'
            : 'Thanh toán chưa thành công. Bạn có thể thử lại trong lịch sử.',
        success ? 'success' : 'error'
    );
}
 
function formatDate(value) {
    if (!value) return '-';
    return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
}
 
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
 
    toast.innerText = message;
    toast.className = `toast show ${type === 'error' ? 'error' : ''}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.className = 'toast';
    }, 2800);
}
 

function goBackToHome() {
    window.location.href = '/frontend/home.html';
}
 
function logoutCustomer() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/frontend/login.html';
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}
