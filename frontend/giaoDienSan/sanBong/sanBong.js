function changeImg(src) {
    document.getElementById('mainImg').src = src;
}

function selectSlot(btn) {
    // Bỏ chọn các nút khác
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    
    // Chọn nút hiện tại
    btn.classList.add('active');
    
    // Cập nhật giá (Giả sử 300k/h)
    document.getElementById('totalPrice').innerText = "300.000đ";
}

function checkout() {
    const selected = document.querySelector('.slot.active');
    if (!selected) {
        alert("Vui lòng chọn khung giờ để thi đấu!");
        return;
    }
    const date = document.getElementById('playDate').value;
    alert(`Xác nhận đặt sân vào ngày ${date} khung giờ ${selected.innerText}. Đang chuyển đến trang thanh toán...`);
}