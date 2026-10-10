# ══════════════════════════════════════════════
# Agentra frontend — do marhalon ki recipe (multi-stage)
# ══════════════════════════════════════════════
# Marhala 1 (Node): npm ci + npm run build -> dist/
# Marhala 2 (nginx): SIRF dist/ + nginx.conf. Node, node_modules aur
# source code peeche reh jate hain (~50 MB image, ~1 GB nahi).
#
# Backend ka pata BUILD ke waqt JS mein pakka hota hai (Vite):
#   docker compose build frontend          (VITE_API_URL Backend/.env ya
#                                           compose default se aata hai)
# ⚠ Pata badla -> image DOBARA banao. Sirf restart kaafi nahi.
#   Deploy: DOCKER_PLAN.md Phase 6.

# ──── Marhala 1: build ────
FROM node:22-alpine AS build
WORKDIR /app

# Pehle sirf package files — cache: code badle to npm ci dobara nahi
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build argument — compose se aata hai. Khali ho to RUKO: warna
# src/config.js andaza lagata (localhost -> 127.0.0.1:8000 = LAPTOP ka
# backend, scheduler / emails ON wala).
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" \
 || (echo "VITE_API_URL build argument khali hai — docker-compose.yml / Backend/.env dekhein" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ──── Marhala 2: chalane wali image ────
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# CMD nahi likha — nginx image ka apna CMD (nginx chalao) kaafi hai
