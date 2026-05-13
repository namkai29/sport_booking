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
    const bookingDate = new Date(booking.ngayDat).toLocaleDateString('vi-VN');
    const amount = Number(booking.tongTien || 0).toLocaleString('vi-VN');
    const canCancel = booking.trangThai === 'cho_xac_nhan';
    const bookingStatus = escapeHtml(getBookingStatusText(booking.trangThai));
    const paymentStatus = escapeHtml(getPaymentStatusText(booking.trangThaiTT));
 
    return `
        <article class="history-card">
            <div>
                <h3>${escapeHtml(booking.tenSan)}</h3>
                <p><i class="fa-regular fa-calendar"></i> ${bookingDate}</p>
                <p><i class="fa-regular fa-clock"></i> ${booking.gioBatDau.slice(0, 5)} - ${booking.gioKetThuc.slice(0, 5)}</p>
                <p><i class="fa-solid fa-money-bill-wave"></i> ${amount}đ</p>
            </div>
            <div class="history-actions">
                <span class="booking-status ${booking.trangThai}">${bookingStatus}</span>
                <span class="payment-status">${paymentStatus}</span>
                ${canCancel ? `<button class="btn-cancel-booking" onclick="openCancelDialog(${booking.datSanId})">Hủy đơn</button>` : ''}
            </div>
            <div class="booking-progress" aria-label="Tiến trình đơn đặt sân">
                ${renderProgress(booking.trangThai)}
            </div>
        </article>
    `;
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
