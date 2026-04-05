// Xử lý chọn số sân
document.querySelectorAll('.num-btn:not(.busy)').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

// Xử lý chọn khung giờ
document.querySelectorAll('.time-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

function handleBooking() {
    const selectedCourt = document.querySelector('.num-btn.active').innerText;
    const selectedTime = document.querySelector('.time-btn.active').innerText;
    
    alert(`Bạn đã chọn ${selectedCourt} vào khung giờ ${selectedTime}. 
Hệ thống sẽ chuyển bạn đến trang thanh toán ngay bây giờ!`);
}