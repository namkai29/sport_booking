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
 
        if (bookings.length === 0) {
            status.innerText = 'Bạn chưa có đơn đặt sân nào.';
            return;
        }
 
        status.style.display = 'none';
        list.innerHTML = bookings.map(renderBookingCard).join('');
    } catch (err) {
        status.className = 'error';
        status.innerText = err.message;
    }
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
                ${canCancel ? `<button class="btn-cancel-booking" onclick="cancelBooking(${booking.datSanId})">Hủy đơn</button>` : ''}
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
 
async function cancelBooking(datSanId) {
    if (!confirm('Bạn có chắc muốn hủy đơn đặt sân này?')) return;
 
    const token = localStorage.getItem('token');
 
    try {
        const res = await fetch(`/api/bookings/cancel/${datSanId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
 
        if (!res.ok) {
            throw new Error(data.message || 'Không thể hủy đơn đặt sân');
        }
 
        alert(data.message || 'Đã hủy đơn đặt sân');
        loadBookingHistory();
    } catch (err) {
        alert(err.message);
    }
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
