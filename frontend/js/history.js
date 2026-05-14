document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
 
    if (!token) {
        alert('Vui lòng đăng nhập để xem lịch sử đặt sân!');
        window.location.href = '/frontend/index.html';
        return;
    }
 
    if (user.ten) {
        document.getElementById('historyUserName').innerText = `Chào, ${user.ten}`;
    }
 
    loadBookingHistory();
});

let allBookings = [];
let pendingCancelBookingId = null;
const highlightedBookingId = new URLSearchParams(window.location.search).get('bookingId');
 
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
    const amount = Number(booking.tongTien || 0).toLocaleString('vi-VN');
    const canCancel = booking.trangThai === 'cho_xac_nhan';
    const bookingStatus = escapeHtml(getBookingStatusText(booking.trangThai));
    const paymentStatus = escapeHtml(getPaymentStatusText(booking.trangThaiTT));
    const isHighlighted = String(booking.datSanId) === highlightedBookingId;
 
    return `
        <article class="history-card ${isHighlighted ? 'highlighted' : ''}" data-booking-id="${booking.datSanId}">
            <div>
                <h3>${escapeHtml(booking.tenSan)} <small>#${booking.datSanId}</small></h3>
                <p><i class="fa-regular fa-calendar"></i> ${bookingDate}</p>
                <p><i class="fa-regular fa-clock"></i> ${booking.gioBatDau.slice(0, 5)} - ${booking.gioKetThuc.slice(0, 5)}</p>
                <p><i class="fa-solid fa-money-bill-wave"></i> ${amount}đ</p>
            </div>
            <div class="history-actions">
                <span class="booking-status ${booking.trangThai}">${bookingStatus}</span>
                <span class="payment-status">${paymentStatus}</span>
                <button class="btn-outline btn-small" onclick="openBookingDetail(${booking.datSanId})">Xem chi tiết</button>
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
            <div><span>Khung giờ</span><strong>${booking.gioBatDau.slice(0, 5)} - ${booking.gioKetThuc.slice(0, 5)}</strong></div>
            <div><span>Trạng thái đơn</span><strong>${escapeHtml(getBookingStatusText(booking.trangThai))}</strong></div>
            <div><span>Thanh toán</span><strong>${escapeHtml(getPaymentStatusText(booking.trangThaiTT))}</strong></div>
            <div><span>Phương thức</span><strong>${escapeHtml(booking.phuongThuc || 'Thanh toán tại sân')}</strong></div>
            <div><span>Tổng tiền</span><strong>${Number(booking.tongTien || 0).toLocaleString('vi-VN')}đ</strong></div>
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
 
function getPaymentStatusText(status) {
    const labels = {
        chua_thanh_toan: 'Chưa thanh toán',
        da_thanh_toan: 'Đã thanh toán'
    };
    return labels[status] || 'Chưa thanh toán';
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
    showToast('Đặt sân thành công. Đơn của bạn đang chờ chủ sân xác nhận.');
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
 
function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}
