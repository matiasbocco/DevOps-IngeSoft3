# Test stage
FROM node:20-alpine AS test
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENTRYPOINT ["npm", "run", "test:coverage"]

# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine AS runtime
# nginx procesa /etc/nginx/templates/*.template y reemplaza ${VARIABLE} al arrancar.
# Los valores por defecto son los de docker compose; cada entorno los pisa si hace falta.
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV BACKEND_URL=http://backend:8080 \
    DNS_RESOLVER=127.0.0.11
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
