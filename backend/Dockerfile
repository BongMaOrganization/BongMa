FROM node:18-alpine
WORKDIR /app
# Copy file quản lý thư viện
COPY package*.json ./
RUN npm install
# Copy toàn bộ code logic game (server.js, socket_handler.js,...)
COPY . .
# Socket.io thường chạy trên port 3000 hoặc tùy bạn cấu hình trong server.js
EXPOSE 3000
CMD ["node", "server.js"]