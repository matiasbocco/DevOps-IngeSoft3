[![CI](https://github.com/matiasbocco/DevOps-IngeSoft3/actions/workflows/ci.yml/badge.svg)](https://github.com/matiasbocco/DevOps-IngeSoft3/actions/workflows/ci.yml) 

## Instalación

git clone https://github.com/matiasbocco/ingsoft3-tp01

## TP2 — Inventario

### Levantar con Docker Compose

cp .env.example .env
# editar .env con tu contraseña
docker compose up --build

# Backend disponible en http://localhost:8080
# Frontend disponible en http://localhost:3000
# Swagger en http://localhost:8080/swagger

### Correr tests

# Backend
cd backend.tests && dotnet test

# Frontend
cd frontend && npm test
