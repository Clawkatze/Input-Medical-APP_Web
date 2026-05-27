# 🏥 Input Medical - Sistema de Gestión de Inventario

Sistema web para control de stock de insumos médicos con lógica FIFO, alertas de vencimiento, trazabilidad completa, precios con descuento y gestión de usuarios por roles.

**Stack:** React + Vite · Node.js + Express · PostgreSQL · Docker

---

## 📁 Estructura del proyecto

```
inputmedical/
├── apps/
│   ├── backend/                   ← API REST en Node.js + Express
│   │   ├── src/
│   │   │   ├── config/db.js       ← Conexión a PostgreSQL (pg pool)
│   │   │   ├── controllers/       ← Lógica de negocio por módulo
│   │   │   ├── middleware/        ← Auth JWT + control de roles
│   │   │   ├── routes/            ← Endpoints protegidos por rol
│   │   │   ├── scripts/init.js    ← Crea el Super Admin al arrancar
│   │   │   └── server.js          ← Entrada principal
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── frontend/                  ← App React + Vite + Tailwind
│       ├── src/
│       │   ├── context/           ← AuthContext con helpers de rol
│       │   ├── services/          ← Cliente Axios + helpers de precio
│       │   ├── components/        ← Layout con nav dinámico por rol
│       │   └── pages/             ← 10 páginas de la aplicación
│       ├── Dockerfile
│       ├── package.json
│       └── .env.example
│
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql         ← Tablas, vistas, funciones FIFO base
│       ├── 002_seed.sql           ← Datos de demo (sin usuario hardcodeado)
│       ├── 003_precios.sql        ← precio_unitario + columnas de precio en movimientos
│       ├── 004_valor_inventario.sql ← Vista v_valor_inventario + fn_gran_total
│       ├── 005_precio_descuento.sql ← precio_descuento por producto (V.DESC)
│       ├── 006_roles.sql          ← Sistema de 4 roles
│       ├── 007_entrada_precio_merma.sql ← Precio en entradas + función merma por lote
│       └── 008_ajuste_descuento.sql ← fn_registrar_salida definitiva
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## ✅ Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — debe estar **abierto y corriendo**
- [Node.js 20+](https://nodejs.org/) — incluye `npm` automáticamente

```
node --version    → v20.x.x o superior
npm --version     → incluido con Node.js
docker --version  → confirma instalación
```

> ⚠️ **Windows:** PowerShell no acepta `&&`. Ejecuta los comandos uno por uno.

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

**Windows (PowerShell):**
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

```powershell
docker compose up -d
```

Verifica que los tres contenedores estén en `Up`:

```powershell
docker ps
```

```
inputmedical_db        Up
inputmedical_backend   Up
inputmedical_frontend  Up
```

> ⚠️ Si `inputmedical_backend` aparece como `Restarting`:
> ```powershell
> docker logs inputmedical_backend
> ```

| Servicio  | URL                   |
|-----------|-----------------------|
| Frontend  | http://localhost:5173 |
| Backend   | http://localhost:4000 |
| BD (psql) | localhost:5432        |

---

### Paso 4 — Ingresar al sistema

El **Super Admin se crea automáticamente** al arrancar el backend usando las variables del `.env`. No se requiere ningún paso manual.

Abre el navegador en **http://localhost:5173**

- **Email:** `admin@inputmedical.cl` _(o el que definas en `SUPERADMIN_EMAIL`)_
- **Contraseña:** `admin123` _(o el que definas en `SUPERADMIN_PASSWORD`)_

> ⚠️ Cambia la contraseña del Super Admin desde el panel de Usuarios después del primer ingreso.

---

### Paso 5 — Crear usuarios adicionales

Los usuarios se crean desde la interfaz web, sin tocar SQL ni archivos:

1. Inicia sesión como Super Admin
2. Ve a **Usuarios** en el menú lateral
3. Click en **Nuevo Usuario**
4. Completa nombre, email, contraseña y rol

---

## 🔌 Opción B: Conectar tu BD PostgreSQL existente (Supabase u otro)

**1. Ejecutar las migraciones en orden:**
```bash
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/001_schema.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/002_seed.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/003_precios.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/004_valor_inventario.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/005_precio_descuento.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/006_roles.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/007_entrada_precio_merma.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/008_ajuste_descuento.sql
```

> En Supabase puedes pegar cada archivo en el **SQL Editor** del proyecto.

**2. Editar `apps/backend/.env`:**
```env
DB_HOST=TU_HOST
DB_PORT=5432
DB_NAME=TU_BD
DB_USER=TU_USUARIO
DB_PASSWORD=TU_CONTRASEÑA
```

**3. Comentar el servicio `db` en `docker-compose.yml`:**
```yaml
# db:
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

# Detener todo (mantiene la BD)
docker compose down

# Reset total — borra la BD y vuelve a aplicar todas las migraciones
docker compose down -v
docker compose up -d
```

---

## 👥 Roles del sistema

| Módulo                 | Super Admin | Admin | Bodeguero | Visualizador |
|------------------------|:-----------:|:-----:|:---------:|:------------:|
| Dashboard              | ✅ | ✅ | ✅ | ✅ |
| Ver Productos          | ✅ | ✅ | ✅ | ✅ |
| Crear/Editar Productos | ✅ | ✅ | ❌ | ❌ |
| Registrar Entrada      | ✅ | ✅ | ✅ | ❌ |
| Registrar Salida/Merma | ✅ | ✅ | ✅ | ❌ |
| Alertas                | ✅ | ✅ | ✅ | ✅ |
| Reportes CSV           | ✅ | ✅ | ❌ | ✅ |
| Gestión de Usuarios    | ✅ | ❌ | ❌ | ❌ |
| Precios y Descuentos   | ✅ | ✅ | ❌ | ❌ |

---

## 🔑 API REST — Endpoints

### Autenticación
| Método | Endpoint          | Descripción              |
|--------|-------------------|--------------------------|
| POST   | `/api/auth/login` | Login, retorna JWT       |
| GET    | `/api/auth/me`    | Datos del usuario actual |

### Usuarios _(Solo Super Admin)_
| Método | Endpoint                      | Descripción               |
|--------|-------------------------------|---------------------------|
| GET    | `/api/usuarios`               | Listar usuarios           |
| POST   | `/api/usuarios`               | Crear usuario             |
| PUT    | `/api/usuarios/:id`           | Editar usuario            |
| PUT    | `/api/usuarios/:id/password`  | Cambiar contraseña        |
| DELETE | `/api/usuarios/:id`           | Desactivar usuario        |

### Productos
| Método | Endpoint                          | Roles            |
|--------|-----------------------------------|------------------|
| GET    | `/api/productos`                  | Todos            |
| GET    | `/api/productos/barcode/:codigo`  | Todos            |
| POST   | `/api/productos`                  | SuperAdmin/Admin |
| PUT    | `/api/productos/:id`              | SuperAdmin/Admin |
| DELETE | `/api/productos/:id`              | SuperAdmin/Admin |

### Movimientos
| Método | Endpoint                              | Roles                      |
|--------|---------------------------------------|----------------------------|
| GET    | `/api/movimientos`                    | Todos                      |
| GET    | `/api/movimientos/alertas`            | Todos                      |
| GET    | `/api/movimientos/dashboard-stats`    | Todos                      |
| GET    | `/api/movimientos/valor-inventario`   | Todos                      |
| GET    | `/api/movimientos/lotes/:producto_id` | Todos                      |
| POST   | `/api/movimientos/entrada`            | SuperAdmin/Admin/Bodeguero |
| POST   | `/api/movimientos/salida`             | SuperAdmin/Admin/Bodeguero |
| POST   | `/api/movimientos/merma`              | SuperAdmin/Admin/Bodeguero |

### Reportes _(SuperAdmin, Admin y Visualizador)_
| Método | Endpoint                     | Descripción                    |
|--------|------------------------------|--------------------------------|
| GET    | `/api/reportes/stock`        | CSV stock actual + valor total |
| GET    | `/api/reportes/vencimientos` | CSV productos por vencer       |
| GET    | `/api/reportes/movimientos`  | CSV Kardex completo            |

---

## 💰 Sistema de Precios

Cada producto tiene dos campos de precio:

- **Precio Normal** (`precio_unitario`) — precio de venta regular definido por la empresa
- **V.DESC** (`precio_descuento`) — precio rebajado opcional para productos con descuento

El sistema usa automáticamente `precio_descuento` si existe, sino `precio_unitario`. Al registrar una venta el precio vigente y el descuento aplicado quedan capturados en el movimiento para trazabilidad histórica.

El **Valor Total del Inventario** se calcula como `stock_actual × precio_vigente` por producto, visible en el dashboard y en la tabla de productos.

---

## 📦 Motivos de Salida

| Motivo  | Genera Monto | Descripción |
|---------|:------------:|-------------|
| VENTA   | ✅ | Venta a cliente. Usa precio vigente y calcula descuento si aplica V.DESC. |
| AJUSTE  | ❌ | Corrección de inventario. Solo descuenta unidades sin registrar monto. Usar cuando el conteo físico tiene menos unidades de las que dice el sistema. Si se encontraron unidades sin registrar, usar Registrar Entrada. |
| MERMA   | ✅ | Baja de producto vencido o dañado. Requiere selección manual del lote afectado. |

---

## ⚙️ Cómo funciona FIFO / FEFO

**Ventas y Ajustes** usan FIFO automático:
1. Verifica que haya stock suficiente
2. Ordena los lotes por `fecha_vencimiento ASC` (el que vence antes, primero)
3. Descuenta del primer lote disponible
4. Si la cantidad supera ese lote, continúa con el siguiente
5. Registra el precio vigente en cada movimiento
6. Actualiza el `stock_actual` del producto

**Mermas** usan selección manual de lote porque corresponden a una baja específica de un lote vencido o dañado identificado físicamente, no a una salida comercial.