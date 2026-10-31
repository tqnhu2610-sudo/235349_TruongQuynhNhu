# HE THONG QUAN LY THIET BI PHONG HOC

MSSV: 235349

Ho ten: TruongQuynhNhu

## Cong nghe
- React + Vite
- Node.js + Express
- MongoDB Atlas
- GitHub
- Docker + Docker Hub
- Render

## Cau truc
- backend: REST API quan ly thiet bi
- frontend: giao dien quan ly thiet bi

## Chuc nang
- Xem danh sach thiet bi
- Xem chi tiet
- Them thiet bi
- Sua thiet bi
- Xoa thiet bi
- Tim kiem thiet bi
- Quan ly tinh trang thiet bi

## Huong dan
Cai Node.js va npm.

Backend:
cd backend
npm install
npm start

Frontend:
cd frontend
npm install
npm run dev

## Câu 6. Docker Frontend

Docker Image: quynhnhu26/frontend:1.0

Docker Hub:
https://hub.docker.com/r/quynhnhu26/frontend

Chạy container:
docker run -d --name frontend-235349 -p 8080:80 quynhnhu26/frontend:1.0

## Câu 7. Triển khai Frontend lên Render

- Tên dịch vụ: web-235349
- Frontend URL: https://web-235349.onrender.com
- Backend URL: https://api-235349.onrender.com
- Framework: React + Vite

Chức năng:
- Xem danh sách thiết bị
- Thêm thiết bị
- Sửa thiết bị
- Xóa thiết bị
- Xem chi tiết thiết bị
- Tìm kiếm thiết bị
- Kiểm tra ngày mua hợp lệ

## Câu 8. Triển khai Backend lên Render

- Tên dịch vụ: api-235349
- Docker image: quynhnhu26/backend:1.0
- Backend URL: https://api-235349.onrender.com
- Health: https://api-235349.onrender.com/health
- API: https://api-235349.onrender.com/api/devices
- MongoDB Database: 235349_TruongQuynhNhu
- Collection: devices

Backend kết nối MongoDB Atlas thành công và
đã được triển khai trên Render.

## Câu 9. Kiểm tra tổng thể

Hệ thống quản lý thiết bị phòng học.

MSSV: 235349
Họ tên: TruongQuynhNhu

Các thành phần:
- GitHub: 235349_TruongQuynhNhu
- MongoDB: 235349_TruongQuynhNhu
- Collection: devices
- Docker Backend: quynhnhu26/backend:1.0
- Docker Frontend: quynhnhu26/frontend:1.0
- Render Backend: api-235349
- Render Frontend: web-235349

Các chức năng cần kiểm tra:
- Thêm, sửa, xóa thiết bị
- Xem danh sách và chi tiết
- Tìm kiếm thiết bị
- Kiểm tra tình trạng thiết bị
- Kiểm tra ngày mua không thuộc tương lai