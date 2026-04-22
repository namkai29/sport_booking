// URL API của bạn (Thay bằng link backend thật của bạn)
const API_URL = 'http://localhost:3000/api/products';

// 1. Hàm lấy dữ liệu từ Database
async function fetchOrderData() {
    try {
        const response = await fetch(API_URL);
        const products = await response.json();
        renderOrder(products);
    } catch (error) {
        console.error("Không thể lấy dữ liệu:", error);
        document.getElementById('product-list').innerHTML = "<p>Lỗi tải dữ liệu đơn hàng.</p>";
    }
}

// 2. Hàm hiển thị dữ liệu lên HTML
function renderOrder(products) {
    const productList = document.getElementById('product-list');
    const totalPriceContainer = document.getElementById('total-price');
    
    let html = '';
    let total = 0;

    products.forEach(item => {
        total += item.price;
        html += `
            <div class="item">
                <span>${item.name}</span>
                <span>${item.price.toLocaleString()}đ</span>
            </div>
        `;
    });

    productList.innerHTML = html;
    totalPriceContainer.innerHTML = `<span>Tổng cộng:</span> <span>${total.toLocaleString()}đ</span>`;
}

// 3. Xử lý sự kiện khi nhấn nút Thanh Toán
document.getElementById('checkout-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const orderData = {
        name: document.getElementById('fullname').value,
        phone: document.getElementById('phone').value,
        payment: document.querySelector('input[name="payment"]:checked').value
    };

    console.log("Dữ liệu gửi đi thanh toán:", orderData);
    alert("Đặt hàng thành công! Kiểm tra console log.");
});

// Chạy hàm lấy dữ liệu khi trang web vừa mở
document.addEventListener('DOMContentLoaded', fetchOrderData);