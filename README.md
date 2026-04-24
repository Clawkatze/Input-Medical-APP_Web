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

## 🚀 Levantar el proyecto (opción A: BD en Docker)

### Requisitos
- Docker Desktop instalado y corriendo
- Node.js 20+ (para instalar dependencias localmente)

### Pasos

**1. Copiar variables de entorno:**
```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

**2. Instalar dependencias** (necesario para que Docker monte los volúmenes correctamente):
```bash
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..
```

> ⚠️ **Por qué necesitas `npm install` antes de Docker:**
> Vite y los otros paquetes de `devDependencies` deben estar en `node_modules` localmente.
> Docker monta la carpeta como volumen, así que si `node_modules` no existe, el contenedor no puede arrancar.

**3. Levantar todo:**
```bash
docker compose up -d
```

| Servicio  | URL                     |
|-----------|-------------------------|
| Frontend  | http://localhost:5173   |
| Backend   | http://localhost:4000   |
| BD (psql) | localhost:5432          |

**4. Ingresar al sistema:**
- Email: `admin@inputmedical.cl`
- Contraseña: `admin123`

---

## 🔌 Opción B: Conectar tu BD PostgreSQL existente

Si ya tienes una BD de PostgreSQL creada, sigue estos pasos:

**1. Ejecutar el esquema en tu BD:**
```bash
# Con psql
psql -h TU_HOST -U TU_USUARIO -d TU_BD -f supabase/migrations/001_schema.sql

# Opcional: cargar datos de demo
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
```bash
docker compose up -d backend frontend
```

---

## 🛠 Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Reiniciar un servicio
docker compose restart backend

# Detener todo
docker compose down

# Reset total (borra la BD local)
docker compose down -v

# Correr backend localmente sin Docker
cd apps/backend && npm run dev

# Correr frontend localmente sin Docker
cd apps/frontend && npm run dev
```

---

## 🔑 API REST - Endpoints principales

| Método | Endpoint                        | Descripción                       |
|--------|---------------------------------|-----------------------------------|
| POST   | `/api/auth/login`               | Login, retorna JWT                |
| GET    | `/api/auth/me`                  | Datos del usuario actual          |
| GET    | `/api/productos`                | Listar productos (con búsqueda)   |
| GET    | `/api/productos/barcode/:codigo`| Buscar por barcode o SKU          |
| POST   | `/api/productos`                | Crear producto + lote inicial     |
| PUT    | `/api/productos/:id`            | Editar producto                   |
| DELETE | `/api/productos/:id`            | Desactivar producto (soft delete) |
| POST   | `/api/movimientos/entrada`      | Registrar entrada de stock        |
| POST   | `/api/movimientos/salida`       | Registrar salida (lógica FIFO)    |
| GET    | `/api/movimientos`              | Kardex (filtrable por producto)   |
| GET    | `/api/movimientos/alertas`      | Stock crítico y vencimientos      |
| GET    | `/api/movimientos/dashboard-stats` | KPIs para el dashboard         |
| GET    | `/api/reportes/stock`           | CSV con stock actual              |
| GET    | `/api/reportes/vencimientos`    | CSV de productos por vencer       |
| GET    | `/api/reportes/movimientos`     | CSV Kardex completo               |

---

## ⚙️ Cómo funciona FIFO

La función `fn_registrar_salida` en PostgreSQL:
1. Verifica que haya stock suficiente
2. Obtiene los lotes del producto ordenados por `fecha_vencimiento ASC` (el que vence antes, primero)
3. Descuenta del primer lote disponible
4. Si la cantidad supera ese lote, continúa con el siguiente
5. Registra un movimiento por cada lote consumido
6. Actualiza el `stock_actual` del producto
