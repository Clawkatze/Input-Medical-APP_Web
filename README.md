# 🏥 Input Medical - Sistema de Gestión de Inventario

Sistema web para control de stock de insumos médicos con lógica FIFO, alertas de vencimiento y trazabilidad completa.

**Stack:** React + Vite · Node.js + Express · PostgreSQL · Docker

---

## 📁 Estructura del proyecto

```
inputmedical/
├── apps/
│   ├── backend/                  ← API REST en Node.js + Express
│   │   ├── src/
│   │   │   ├── config/db.js      ← Conexión a PostgreSQL (pg pool)
│   │   │   ├── controllers/      ← Lógica de negocio por módulo
│   │   │   ├── middleware/       ← Auth JWT + manejo de errores
│   │   │   ├── routes/           ← Definición de endpoints
│   │   │   └── server.js         ← Entrada principal
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── frontend/                 ← App React + Vite + Tailwind
│       ├── src/
│       │   ├── context/          ← AuthContext (sesión JWT)
│       │   ├── services/api.js   ← Cliente axios con interceptor de token
│       │   ├── components/       ← Layout compartido (SideNav, TopNav, Footer)
│       │   └── pages/            ← 8 páginas de la aplicación
│       ├── Dockerfile
│       ├── package.json
│       └── .env.example
│
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql        ← Esquema completo + funciones FIFO
│       └── 002_seed.sql          ← Datos de demo + usuario admin
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## ✅ Requisitos previos

Antes de comenzar asegúrate de tener instalado:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — debe estar **abierto y corriendo** antes de cualquier comando Docker
- [Node.js 20+](https://nodejs.org/) — incluye `npm` automáticamente

Para verificar:
```
node --version    → debe mostrar v20.x.x o superior
npm --version     → viene incluido con Node.js
docker --version  → confirma que Docker está instalado
```

> ⚠️ **Usuarios Windows:** los comandos de este README usan PowerShell.
> PowerShell **no acepta** `&&` para encadenar comandos. Ejecútalos uno por uno.

---

## 🚀 Levantar el proyecto (opción A: BD en Docker)

### Paso 1 — Copiar variables de entorno

**Windows (PowerShell):**
```powershell
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

**Mac / Linux:**
```bash
cp .env.example .env && cp apps/backend/.env.example apps/backend/.env && cp apps/frontend/.env.example apps/frontend/.env
```

---

### Paso 2 — Instalar dependencias

Instala los paquetes de Node.js en cada aplicación. Esto es necesario porque Docker monta las carpetas como volumen y necesita encontrar `node_modules` ya creado.

**Windows (PowerShell) — un comando por línea:**
```powershell
cd apps/backend
npm install
cd ../..
cd apps/frontend
npm install
cd ../..
```

**Mac / Linux:**
```bash
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..
```

---

### Paso 3 — Levantar los contenedores

Asegúrate de que **Docker Desktop esté abierto** antes de ejecutar esto:

```powershell
docker compose up -d
```

Verifica que los tres contenedores estén corriendo (todos deben mostrar `Up`, no `Restarting`):

```powershell
docker ps
```

Deberías ver:
```
inputmedical_db        Up
inputmedical_backend   Up
inputmedical_frontend  Up
```

> ⚠️ Si `inputmedical_backend` aparece como `Restarting`, revisa los logs:
> ```powershell
> docker logs inputmedical_backend
> ```

| Servicio  | URL                   |
|-----------|-----------------------|
| Frontend  | http://localhost:5173 |
| Backend   | http://localhost:4000 |
| BD (psql) | localhost:5432        |

---

### Paso 4 — Crear el usuario administrador

El esquema se aplica automáticamente, pero el usuario admin debe crearse una sola vez.

**4a. Generar el hash de la contraseña** (desde la carpeta `apps/backend` donde están las dependencias):

```powershell
cd apps/backend
node -e "const b = require('bcryptjs'); b.hash('admin123', 10).then(h => console.log(h))"
cd ../..
```

Copia el hash que imprime en consola (empieza con `$2a$10$...`).

**4b. Conectarse a la BD e insertar el usuario:**

```powershell
docker exec -it inputmedical_db psql -U postgres -d inputmedical
```

Dentro del prompt de psql, pega esto reemplazando `HASH_AQUI` por el valor copiado:

```sql
INSERT INTO usuarios (email, nombre, password_hash, rol)
VALUES ('admin@inputmedical.cl', 'Administrador', 'HASH_AQUI', 'admin');
\q
```

---

### Paso 5 — Ingresar al sistema

Abre el navegador en **http://localhost:5173**

- **Email:** `admin@inputmedical.cl`
- **Contraseña:** `admin123`

---

## 🔌 Opción B: Conectar tu BD PostgreSQL existente

Si ya tienes una BD de PostgreSQL creada:

**1. Ejecutar el esquema en tu BD:**
```bash
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/001_schema.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/002_seed.sql
```

**2. Editar `apps/backend/.env` con tus credenciales:**
```env
DB_HOST=TU_HOST
DB_PORT=5432
DB_NAME=TU_BD
DB_USER=TU_USUARIO
DB_PASSWORD=TU_CONTRASEÑA
```

**3. En `docker-compose.yml`, comentar el servicio `db`** y quitar el `depends_on` del backend:
```yaml
# db:        ← comentar todo este bloque
#   image: ...
```

**4. Levantar solo backend y frontend:**
```powershell
docker compose up -d backend frontend
```

---

## 🛠 Comandos útiles

```powershell
# Ver logs en tiempo real
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Reiniciar un servicio
docker compose restart backend

# Detener todo
docker compose down

# Reset total (borra la BD local, útil para empezar desde cero)
docker compose down -v
```

---

## 🔑 API REST - Endpoints principales

| Método | Endpoint                           | Descripción                       |
|--------|------------------------------------|-----------------------------------|
| POST   | `/api/auth/login`                  | Login, retorna JWT                |
| GET    | `/api/auth/me`                     | Datos del usuario actual          |
| GET    | `/api/productos`                   | Listar productos (con búsqueda)   |
| GET    | `/api/productos/barcode/:codigo`   | Buscar por barcode o SKU          |
| POST   | `/api/productos`                   | Crear producto + lote inicial     |
| PUT    | `/api/productos/:id`               | Editar producto                   |
| DELETE | `/api/productos/:id`               | Desactivar producto (soft delete) |
| POST   | `/api/movimientos/entrada`         | Registrar entrada de stock        |
| POST   | `/api/movimientos/salida`          | Registrar salida (lógica FIFO)    |
| GET    | `/api/movimientos`                 | Kardex (filtrable por producto)   |
| GET    | `/api/movimientos/alertas`         | Stock crítico y vencimientos      |
| GET    | `/api/movimientos/dashboard-stats` | KPIs para el dashboard            |
| GET    | `/api/reportes/stock`              | CSV con stock actual              |
| GET    | `/api/reportes/vencimientos`       | CSV de productos por vencer       |
| GET    | `/api/reportes/movimientos`        | CSV Kardex completo               |

---

## ⚙️ Cómo funciona FIFO

La función `fn_registrar_salida` en PostgreSQL:
1. Verifica que haya stock suficiente
2. Obtiene los lotes del producto ordenados por `fecha_vencimiento ASC` (el que vence antes, primero)
3. Descuenta del primer lote disponible
4. Si la cantidad supera ese lote, continúa con el siguiente
5. Registra un movimiento por cada lote consumido
6. Actualiza el `stock_actual` del producto