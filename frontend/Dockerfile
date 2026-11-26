# Etapa 1: build de la app React
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
# Commit que se registra en dist/version.json (lo escribe el script "postbuild")
ARG RENDER_GIT_COMMIT=unknown
ENV RENDER_GIT_COMMIT=$RENDER_GIT_COMMIT
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: servir con nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
