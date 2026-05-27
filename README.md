# sport_booking

## Thanh toán

| Phương thức                    | Mô tả                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| **Thanh toán tại sân**   | Thanh toán toàn bộ khi đến sân                       |
| **Cọc online 30% (VNPay)** | Thanh toán trước 30% qua VNPay, 70% còn lại tại sân |

### Cấu hình VNPay sandbox

1. Đăng ký: https://sandbox.vnpayment.vn/devreg/
2. Thêm vào `backend/.env`:

```env
APP_BASE_URL=http://localhost:5000
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_PATH=/frontend/payment-result.html
VNPAY_IPN_PATH=/api/payments/vnpay/ipn
```

3. `cd backend && node server.js`
4. Đặt sân → chọn **Cọc online 30% (VNPay)**

## Chạy project

```bash
mysql -u root -p < database/sport_booking.sql
cd backend && npm install && node server.js
```

Mở http://localhost:5000/frontend/index.html
