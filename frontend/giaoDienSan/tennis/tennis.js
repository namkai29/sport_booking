// Xử lý chọn giờ (Chips)
const chips = document.querySelectorAll('.chip');
chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    });
});

function bookTennis() {
    const date = document.getElementById('tennisDate').value;
    const time = document.querySelector('.chip.active').innerText;
    
    // Tạo hiệu ứng loading đơn giản
    const btn = document.querySelector('.btn-confirm-tennis');
    btn.innerText = "ĐANG XỬ LÝ...";
    btn.style.opacity = "0.7";

    setTimeout(() => {
        alert(`Đặt sân thành công!\nNgày: ${date}\nGiờ: ${time}\nHẹn gặp bạn tại CLB Lan Anh.`);
        btn.innerText = "XÁC NHẬN GIỮ CHỖ";
        btn.style.opacity = "1";
    }, 1500);
}