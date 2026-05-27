const urlParams = new URLSearchParams(window.location.search);
const sanId = urlParams.get('sanId');
let selectedSlot = null;
let availableSlots = [];
let courtName = '';
let selectedPaymentMethod = 'tai_san';
let selectedRating = 5;
let reviewBooking = null;
let onlinePaymentMethod = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!sanId) {
        showToast("Không tìm thấy mã sân!", "error");
        window.location.href = '/frontend/home.html';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.ten && document.getElementById('detailUserName')) {
        document.getElementById('detailUserName').innerText = `Chào, ${user.ten}`;
    }

    // 1. Cấu hình ngày mặc định
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('bookingDate');
    dateInput.value = today;
    dateInput.min = today;

    // 2. Chạy lấy dữ liệu
    fetchCourtData();
    loadSlots();
    loadReviews();
    loadReviewEligibility();
    setupReviewStars();
    checkOnlinePaymentAvailable();

    // Lắng nghe sự kiện đổi ngày
    dateInput.addEventListener('change', loadSlots);
});

async function checkOnlinePaymentAvailable() {
    try {
        const res = await fetch('/api/payments/online/available');
        const data = await res.json();
        onlinePaymentMethod = data.vnpay?.available ? 'vnpay' : null;

        const vnpayOption = document.getElementById('payVnpayOption');
        if (vnpayOption) {
            vnpayOption.style.display = data.vnpay?.available ? '' : 'none';
        }

        if (!data.anyAvailable && selectedPaymentMethod === 'vnpay') {
            selectPaymentMethod('tai_san');
        }
    } catch {
        onlinePaymentMethod = null;
        document.getElementById('payVnpayOption')?.style.setProperty('display', 'none');
    }
}

function updateReviewPriceDisplay() {
    const price = Number(selectedSlot?.finalPrice || 0);
    const el = document.getElementById('reviewPrice');
    if (!el || !price) return;

    if (selectedPaymentMethod === 'vnpay') {
        const coc = Math.max(1000, Math.round(price * 0.3));
        el.innerText = `${coc.toLocaleString('vi-VN')}đ (cọc 30% / tổng ${price.toLocaleString('vi-VN')}đ)`;
    } else {
        el.innerText = `${price.toLocaleString('vi-VN')}đ`;
    }
}

// Hàm lấy tất cả thông tin sân từ CSDL
async function fetchCourtData() {
    try {
        const res = await fetch(`/api/bookings/detail/${sanId}`);
       
        
        const court = await res.json();
         if (!res.ok) throw new Error(court.message || "Không thể lấy dữ liệu sân");
 
        courtName = court.tenSan || '';

        // Đổ dữ liệu vào UI
        document.getElementById('courtName').innerText = court.tenSan || 'Sân thể thao';
        document.getElementById('courtType').innerText = court.tenLoai || 'Sân';
        // Lấy cột moTa từ CSDL của bạn
        document.getElementById('courtDesc').innerText = court.moTa || "Sân bóng tiêu chuẩn, đèn sáng cực tốt, phục vụ chu đáo.";
        
        // Kết hợp địa chỉ chi tiết
        const addressParts = [court.diaChiChiTiet, court.phuongXa, court.quanHuyen, court.tinhThanh].filter(Boolean);
        const fullAddress = addressParts.join(', ') || 'Chưa cập nhật địa chỉ';
        document.getElementById('courtAddr').textContent = fullAddress;
        setCourtImage(court.hinhAnh);
        updateCourtRatingSummary(court.diemTrungBinh, court.tongDanhGia);
        // Tích hợp bản đồ động
        updateDetailMap(court, fullAddress);

    } catch (err) {
        console.error("Lỗi fetchCourtData:", err);
        document.getElementById('courtName').innerText = "Không thể tải thông tin sân";
        document.getElementById('courtAddr').innerText = err.message;
        document.getElementById('courtDesc').innerText = "Vui lòng kiểm tra backend hoặc thử tải lại trang.";
        showToast(err.message, "error");
    }
}

// Hàm load khung giờ (Ma trận màu sắc)
async function loadSlots() {
    const ngay = document.getElementById('bookingDate').value;
    const container = document.getElementById('slotContainer');
    
    container.innerHTML = "<p>Đang kiểm tra lịch trống...</p>";
    selectedSlot = null;
    document.getElementById('btnConfirm').style.display = 'none';
    document.getElementById('priceInfo').style.display = 'none';
    resetConfirmButton();
    try {
        const res = await fetch(`/api/bookings/check-available?sanId=${sanId}&ngay=${ngay}`);
        const slots = await res.json();
        if (!res.ok) {
            throw new Error(slots.message || "Lỗi tải lịch sân");
        }

        if (slots.length === 0) {
            container.innerHTML = "<p>Sân chưa cấu hình khung giờ cho ngày này.</p>";
            return;
        }
        availableSlots = slots;
        container.innerHTML = slots.map(slot => {
            const isAvailable = slot.status === 'Available';
            const statusText = getSlotStatusText(slot.status);
            return `
            <div class="slot-item ${escapeHtml(slot.status)}"
            ${isAvailable ? `onclick="selectSlot(this, ${slot.khungGioId})"` : ''}
                 title="${escapeHtml(statusText)}">
                <strong>${escapeHtml(slot.gioBatDau.substring(0,5))}</strong>
                <small>${isAvailable ? `${parseInt(slot.finalPrice).toLocaleString()}đ` : escapeHtml(statusText)}</small>
                </div>
        `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    }
}

// Xử lý khi người dùng click chọn giờ
function selectSlot(element, khungGioId) {
    const slot = availableSlots.find(item => item.khungGioId === khungGioId);
    if (!slot) return;
    if (slot.status !== 'Available') return;

    document.querySelectorAll('.slot-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedSlot = slot;

    document.getElementById('priceInfo').style.display = 'flex';
    document.getElementById('totalPrice').innerText = parseInt(slot.finalPrice).toLocaleString() + 'đ';
    document.getElementById('bookingSummary').innerText = `${courtName || 'Sân'} · ${document.getElementById('bookingDate').value} · ${slot.gioBatDau.substring(0,5)} - ${slot.gioKetThuc.substring(0,5)}`;
    document.getElementById('btnConfirm').style.display = 'block';
}

function openBookingModal() {
    if (!selectedSlot) {
        showToast('Vui lòng chọn khung giờ trước khi đặt sân.', 'error');
        return;
    }
 
    const token = localStorage.getItem('token');
    if (!token) {
        showToast("Vui lòng đăng nhập để đặt sân!", "error");
        window.location.href = '/frontend/login.html';
        return;
    }
 
    const bookingDate = document.getElementById('bookingDate').value;
    document.getElementById('reviewCourtName').innerText = courtName || 'Sân';
    document.getElementById('reviewDate').innerText = formatDate(bookingDate);
    document.getElementById('reviewTime').innerText = `${selectedSlot.gioBatDau.substring(0,5)} - ${selectedSlot.gioKetThuc.substring(0,5)}`;
    updateReviewPriceDisplay();
    document.getElementById('bookingModal').classList.add('show');
}
 
function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('show');
}

// Gửi yêu cầu đặt sân
async function submitBooking() {
    if (!selectedSlot) return;

    // Logic kiểm tra đăng nhập (nếu bạn đã làm)
    const token = localStorage.getItem('token');
    if (!token) {
        showToast("Vui lòng đăng nhập để đặt sân!", "error");
        window.location.href = '/frontend/login.html';
        return;
    }

    const btnConfirm = document.getElementById('btnConfirm');
    const submitBookingBtn = document.getElementById('submitBookingBtn');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = 'ĐANG GỬI YÊU CẦU...';
    submitBookingBtn.disabled = true;
    submitBookingBtn.innerHTML = 'Đang gửi...';
 
    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sanId: Number(sanId),
                ngayDat: document.getElementById('bookingDate').value,
                khungGioId: selectedSlot.khungGioId,
                phuongThucThanhToan: selectedPaymentMethod
            })
        });
        const data = await res.json();
 
        if (!res.ok) {
            throw new Error(data.message || 'Không thể đặt sân');
        }
 
        if (selectedPaymentMethod === 'vnpay') {
            if (!onlinePaymentMethod) {
                throw new Error('VNPay chưa được cấu hình. Vui lòng chọn Thanh toán tại sân.');
            }
            const payData = await payOnline(data.datSanId);
            if (payData.payment?.payUrl) {
                window.location.href = payData.payment.payUrl;
                return;
            }
            throw new Error('Không nhận được liên kết thanh toán VNPay');
        }

        closeBookingModal();
        showToast(data.message || 'Đặt sân thành công!');
        setTimeout(() => {
            window.location.href = `/frontend/history.html?bookingId=${data.datSanId || ''}`;
        }, 500);
    } catch (err) {
        showToast(err.message, "error");
        resetConfirmButton();
    }
    finally {
        submitBookingBtn.disabled = false;
        submitBookingBtn.innerHTML = 'Gửi yêu cầu đặt sân';
    }
}
/*note */


function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.getElementById('payAtCourtOption')?.classList.toggle('active', method === 'tai_san');
    document.getElementById('payVnpayOption')?.classList.toggle('active', method === 'vnpay');
    updateReviewPriceDisplay();
    const submitBookingBtn = document.getElementById('submitBookingBtn');
    if (submitBookingBtn) {
        submitBookingBtn.innerHTML = method === 'vnpay'
            ? 'Đặt sân & cọc 30% VNPay'
            : 'Gửi yêu cầu đặt sân';
    }
}

async function payOnline(datSanId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Vui lòng đăng nhập để thanh toán.', 'error');
        return;
    }

    const startRes = await fetch(`/api/payments/${datSanId}/start-online`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phuongThuc: 'vnpay' })
    });
    const payment = await startRes.json();
    if (!startRes.ok) throw new Error(payment.message || 'Không thể tạo thanh toán online');
    return payment;
}
 
async function loadReviews() {
    try {
        const res = await fetch(`/api/reviews/court/${sanId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tải đánh giá');
        updateCourtRatingSummary(data.summary?.diemTrungBinh, data.summary?.tongDanhGia);
        renderReviews(data.reviews || []);
    } catch (err) {
        document.getElementById('reviewList').innerHTML = `<div class="review-empty">${escapeHtml(err.message)}</div>`;
    }
}
 
async function loadReviewEligibility() {
    const token = localStorage.getItem('token');
    const eligibility = document.getElementById('reviewEligibility');
    const form = document.getElementById('reviewForm');
    if (!token) {
        eligibility.innerText = 'Đăng nhập và đặt sân để gửi đánh giá.';
        form.style.display = 'none';
        return;
    }
 
    try {
        const res = await fetch(`/api/reviews/court/${sanId}/my-eligibility`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể kiểm tra quyền đánh giá');
        reviewBooking = data.booking;
        if (data.canReview && reviewBooking) {
            eligibility.innerText = 'Bạn có một đơn đã xác nhận/hoàn thành có thể đánh giá.';
            document.getElementById('reviewBookingInfo').innerText = `Đơn #${reviewBooking.datSanId} · ${formatDate(reviewBooking.ngayDat)} · ${String(reviewBooking.gioBatDau || '').slice(0, 5)} - ${String(reviewBooking.gioKetThuc || '').slice(0, 5)}`;
            form.style.display = 'block';
        } else {
            eligibility.innerText = data.reviewedCount > 0
                ? 'Bạn đã đánh giá các đơn đủ điều kiện. Mỗi đơn chỉ được đánh giá 1 lần.'
                : 'Bạn cần có đơn đã xác nhận hoặc hoàn thành để đánh giá sân.';
            form.style.display = 'none';
        }
    } catch (err) {
        eligibility.innerText = err.message;
        form.style.display = 'none';
    }
}
 
function setupReviewStars() {
    document.querySelectorAll('#starInput button').forEach(button => {
        button.addEventListener('click', () => {
            selectedRating = Number(button.dataset.star || 5);
            updateStarInput();
        });
    });
    updateStarInput();
}
 
function updateStarInput() {
    document.querySelectorAll('#starInput button').forEach(button => {
        button.classList.toggle('active', Number(button.dataset.star) <= selectedRating);
    });
}
 
async function submitReview() {
    if (!reviewBooking) {
        showToast('Bạn chưa có đơn đủ điều kiện đánh giá.', 'error');
        return;
    }
 
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/reviews/court/${sanId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                datSanId: reviewBooking.datSanId,
                soSao: selectedRating,
                noiDung: document.getElementById('reviewContent').value
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể gửi đánh giá');
        showToast(data.message || 'Đã gửi đánh giá');
        document.getElementById('reviewContent').value = '';
        await loadReviews();
        await loadReviewEligibility();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
 
function updateCourtRatingSummary(avgRating, reviewCount) {
    const avg = Number(avgRating || 0);
    const count = Number(reviewCount || 0);
    const avgElement = document.getElementById('avgRating');
    const starsElement = document.getElementById('avgRatingStars');
    const countElement = document.getElementById('reviewCount');
    if (!avgElement || !starsElement || !countElement) return;
    avgElement.innerText = avg ? avg.toFixed(1) : '0.0';
    starsElement.innerText = renderStars(avg);
    countElement.innerText = count ? `${count} đánh giá` : 'Chưa có đánh giá';
}
 
function renderReviews(reviews) {
    const list = document.getElementById('reviewList');
    if (!reviews.length) {
        list.innerHTML = '<div class="review-empty">Chưa có đánh giá nào cho sân này.</div>';
        return;
    }
 
    list.innerHTML = reviews.map(review => `
        <article class="review-card">
            <div class="review-card-header">
                <div>
                    <strong>${escapeHtml(review.tenKhach || 'Khách hàng')}</strong>
                    <div class="review-stars">${renderStars(Number(review.soSao || 0))}</div>
                </div>
                <small>${formatDate(review.ngayDG?.slice(0, 10))}</small>
            </div>
            <small>Đã đặt: ${formatDate(review.ngayDat)} · ${String(review.gioBatDau || '').slice(0, 5)} - ${String(review.gioKetThuc || '').slice(0, 5)}</small>
            ${review.noiDung ? `<p>${escapeHtml(review.noiDung)}</p>` : ''}
        </article>
    `).join('');
}
 
function renderStars(value) {
    const rounded = Math.round(Number(value || 0));
    return '★★★★★'.split('').map((star, index) => index < rounded ? '★' : '☆').join('');
}
 

function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN');
}

function resetConfirmButton() {
    const btnConfirm = document.getElementById('btnConfirm');
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = 'XÁC NHẬN ĐẶT SÂN <i class="fa-solid fa-chevron-right"></i>';
}

function setCourtImage(imageUrl) {
    const image = document.getElementById('courtImg');
    const fallback = document.getElementById('courtImgFallback');
    const normalizedImageUrl = getImageUrl(imageUrl);
 
    image.removeAttribute('src');
    image.style.display = 'none';
    fallback.style.display = 'flex';

    if (!normalizedImageUrl) {
        image.style.display = 'none';
        fallback.style.display = 'flex';
        return;
    }
 
    image.onload = () => {
        fallback.style.display = 'none';
        image.style.display = 'block';
    };
    image.onerror = () => {
        image.style.display = 'none';
        fallback.style.display = 'flex';
    };
    image.src = normalizedImageUrl;
}

function getImageUrl(value) {
    const imagePath = String(value || "").trim();
    if (!imagePath) return "";

    if (imagePath.startsWith("/uploads/courts/")) return imagePath;
    if (imagePath.startsWith("uploads/courts/")) return `/${imagePath}`;

    const uploadIndex = imagePath.replace(/\\/g, "/").indexOf("/uploads/courts/");
    if (uploadIndex >= 0) {
        const normalizedPath = imagePath.replace(/\\/g, "/").slice(uploadIndex);
        const filename = normalizedPath.split("/").pop();
        return filename ? `/uploads/courts/${filename}` : "";
    }

    return "";
}


function goBackToHome() {
    window.location.href = '/frontend/home.html';
}
 
function logoutCustomer() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/frontend/login.html';
}

function updateDetailMap(court, fullAddress) {
    const map = document.getElementById('googleMap');
    if (!map) return;

    const lat = Number(court.viDo);
    const lng = Number(court.kinhDo);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        map.src = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=16&output=embed`;
        return;
    }

    if (fullAddress) {
        map.src = `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;
    }
}
 

function getSlotStatusText(status) {
    const labels = {
        Available: 'Còn trống',
        Full: 'Đã đặt',
        Closed: 'Đóng hoặc bảo trì',
        NoPrice: 'Chưa cấu hình giá'
    };
    return labels[status] || status;
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