# Frontend Dockerfile for Swagger Aggregator
# Multi-stage build: Node for building, Nginx for serving

# Stage 1: Build the React app
FROM node:18-alpine AS builder
WORKDIR /app

# Copy workspace root package.json and shared package
COPY package.json ./
COPY shared/ ./shared/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./frontend/

# Build the frontend
RUN npm run build --workspace=frontend

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Nginx config for SPA routing (redirect all to index.html)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
