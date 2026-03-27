const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

// Thêm class 'active' để kích hoạt animation CSS
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Giả lập xử lý form (Bạn có thể thêm logic thực tế ở đây)
document.querySelectorAll('button:not(.hidden)').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // e.preventDefault(); 
        const type = btn.innerText;
        console.log(`Bạn vừa nhấn nút: ${type}`);
    });
});