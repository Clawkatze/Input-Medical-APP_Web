# 🏥 Input Medical - Sistema de Gestión de Inventario

Sistema web para control de stock de insumos médicos con lógica FIFO, alertas de vencimiento, trazabilidad completa, precios con descuento, reportes Excel y gestión de usuarios por roles.

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
│       │   └── pages/             ← Páginas de la aplicación
│       ├── Dockerfile
│       ├── package.json
│       └── .env.example
│
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql               ← Tablas, vistas, funciones FIFO base
│       ├── 002_seed.sql                 ← Datos de demo
│       ├── 003_precios.sql              ← precio_unitario + columnas de precio en movimientos
│       ├── 004_valor_inventario.sql     ← Vista v_valor_inventario + fn_gran_total
│       ├── 005_precio_descuento.sql     ← precio_descuento por producto (V.DESC)
│       ├── 006_roles.sql                ← Sistema de 4 roles
│       ├── 007_entrada_precio_merma.sql ← Precio en entradas + función merma por lote
│       ├── 008_ajuste_descuento.sql     ← fn_registrar_salida definitiva
│       ├── 009_eliminacion_permanente.sql ← Eliminación permanente + vistas actualizadas
│       ├── 010_indices_unicos_parciales.sql ← Índices parciales + fn_eliminar_producto
│       └── 011_alertas_revisadas.sql    ← Tabla alertas_revisadas
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

### Paso 2 — Levantar los contenedores

```powershell
docker compose up -d --build
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

| Servicio  | URL                   |
|-----------|-----------------------|
| Frontend  | http://localhost:5173 |
| Backend   | http://localhost:4000 |
| BD (psql) | localhost:5432        |

### Paso 3 — Ingresar al sistema

El **Super Admin se crea automáticamente** al arrancar el backend.

Abre el navegador en **http://localhost:5173**

- **Email:** `admin@inputmedical.cl` _(o el que definas en `SUPERADMIN_EMAIL`)_
- **Contraseña:** `admin123` _(o el que definas en `SUPERADMIN_PASSWORD`)_

> ⚠️ Cambia la contraseña del Super Admin desde el panel de Usuarios después del primer ingreso.

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
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/009_eliminacion_permanente.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/010_indices_unicos_parciales.sql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/011_alertas_revisadas.sql
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

**3. Levantar sin la BD Docker:**
```powershell
docker compose up -d --build backend frontend
```

---

## ☁️ Despliegue en producción (Supabase + Railway + Vercel)

### Base de datos — Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar las 11 migrations en orden desde el **SQL Editor**
3. Obtener la connection string desde **Settings → Database → Transaction pooler**

### Backend — Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Seleccionar el repositorio y configurar **Root Directory** como `Producto/apps/backend`
4. Agregar las variables de entorno:

```env
NODE_ENV=production
PORT=4000
DB_HOST=aws-x-region.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.xxxxxxxxxxxx
DB_PASSWORD=tu_contraseña_supabase
JWT_SECRET=un_secreto_seguro_de_minimo_32_caracteres
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://tu-app.vercel.app
SUPERADMIN_EMAIL=admin@inputmedical.cl
SUPERADMIN_PASSWORD=cambia_esto
SUPERADMIN_NOMBRE=Administrador
```

### Frontend — Vercel

1. Crear cuenta en [vercel.com](https://vercel.com)
2. **New Project → Import Git Repository**
3. Configurar **Root Directory** como `Producto/apps/frontend`
4. Agregar variable de entorno:

```env
VITE_API_URL=https://tu-backend.railway.app
```

---

## 🛠 Comandos útiles (desarrollo local)

```powershell
# Ver logs en tiempo real
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Detener todo (mantiene la BD)
docker compose down

# Reset total — borra la BD y vuelve a aplicar todas las migraciones
docker compose down -v
docker compose up -d --build
```

---

## 👥 Roles del sistema

| Módulo                  | Super Admin | Admin | Bodeguero | Visualizador |
|-------------------------|:-----------:|:-----:|:---------:|:------------:|
| Dashboard               | ✅ | ✅ | ✅ | ✅ |
| Ver Productos           | ✅ | ✅ | ✅ | ✅ |
| Crear/Editar Productos  | ✅ | ✅ | ❌ | ❌ |
| Registrar Entrada       | ✅ | ✅ | ✅ | ❌ |
| Registrar Salida/Merma  | ✅ | ✅ | ✅ | ❌ |
| Alertas / Monitor       | ✅ | ✅ | ✅ | ✅ |
| Reportes Excel          | ✅ | ✅ | ❌ | ✅ |
| Reporte Financiero      | ✅ | ✅ | ❌ | ✅ |
| Gestión de Usuarios     | ✅ | ❌ | ❌ | ❌ |
| Precios y Descuentos    | ✅ | ✅ | ❌ | ❌ |

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
| GET    | `/api/productos/categorias`       | Todos            |
| GET    | `/api/productos/barcode/:codigo`  | Todos            |
| GET    | `/api/productos/:id`              | Todos            |
| POST   | `/api/productos`                  | SuperAdmin/Admin |
| PUT    | `/api/productos/:id`              | SuperAdmin/Admin |
| DELETE | `/api/productos/:id`              | SuperAdmin/Admin |
| PUT    | `/api/productos/:id/reactivar`    | SuperAdmin/Admin |
| DELETE | `/api/productos/:id/permanente`   | SuperAdmin/Admin |

### Movimientos
| Método | Endpoint                                  | Roles                      |
|--------|-------------------------------------------|----------------------------|
| GET    | `/api/movimientos`                        | Todos                      |
| GET    | `/api/movimientos/alertas`                | Todos                      |
| GET    | `/api/movimientos/dashboard-stats`        | Todos                      |
| GET    | `/api/movimientos/valor-inventario`       | Todos                      |
| GET    | `/api/movimientos/lotes/:producto_id`     | Todos                      |
| GET    | `/api/movimientos/reporte-financiero`     | Todos                      |
| POST   | `/api/movimientos/entrada`                | SuperAdmin/Admin/Bodeguero |
| POST   | `/api/movimientos/salida`                 | SuperAdmin/Admin/Bodeguero |
| POST   | `/api/movimientos/merma`                  | SuperAdmin/Admin/Bodeguero |

### Alertas
| Método | Endpoint                  | Descripción                              |
|--------|---------------------------|------------------------------------------|
| GET    | `/api/alertas/count`      | Contador de alertas pendientes           |
| GET    | `/api/alertas/pendientes` | Lotes con vencimiento ≤90 días sin revisar |
| POST   | `/api/alertas/revisar`    | Marcar alertas como revisadas hoy        |

### Reportes _(SuperAdmin, Admin y Visualizador)_
| Método | Endpoint                      | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/reportes/stock`         | Excel stock actual + valor total     |
| GET    | `/api/reportes/vencimientos`  | Excel productos por vencer hasta 90d |
| GET    | `/api/reportes/movimientos`   | Excel Kardex completo                |
| GET    | `/api/reportes/financiero`    | Excel reporte financiero por período |

---

## 💰 Sistema de Precios

- **Precio Normal** (`precio_unitario`) — precio de venta regular
- **V.DESC** (`precio_descuento`) — precio rebajado opcional

El sistema usa automáticamente `precio_descuento` si existe, sino `precio_unitario`. El **Valor Total del Inventario** se calcula como `stock_actual × precio_vigente` y se actualiza en tiempo real.

---

## 📦 Motivos de Salida

| Motivo  | Genera Monto | Descripción |
|---------|:------------:|-------------|
| VENTA   | ✅ | Usa precio vigente, calcula descuento si aplica V.DESC |
| AJUSTE  | ❌ | Solo descuenta unidades, sin precio ni monto |
| MERMA   | ✅ | Selección manual de lote, usa precio vigente |

---

## ⚙️ Cómo funciona FIFO / FEFO

**Ventas y Ajustes** — FIFO automático por `fecha_vencimiento ASC`.

**Mermas** — selección manual del lote afectado, ya que corresponden a una baja específica identificada físicamente.

---

## 🔔 Sistema de Alertas

El **Monitor de Estado** muestra:
- **Stock Crítico** — productos con `stock_actual ≤ stock_minimo`
- **Próximo a Vencer** — lotes con vencimiento en los próximos 90 días

Los filtros de días (≤30 / ≤60 / ≤90) aplican solo en la pestaña de vencimiento.

Al iniciar sesión aparece un modal con los lotes no revisados hoy. Las alertas revisadas se registran en `alertas_revisadas` y no vuelven a aparecer hasta el día siguiente.

---

## 📊 Reporte Financiero

Accesible desde **Reporte Financiero** en el menú lateral. Filtros disponibles:

- **Hoy** — corte a medianoche hora Chile (America/Santiago)
- **Esta semana** — desde el lunes de la semana actual
- **Este mes** — desde el primer día del mes actual
- **Rango personalizado** — fecha desde / hasta a elección

Incluye resumen de ventas, descuentos, mermas, neto y gráfico de evolución diaria. Exportable a Excel.