# 🚗 CarWash — Fullstack

**Django REST API + Angular 21 + SQLite + Suscripción mensual**

---

## Arquitectura

```
carwash/
├── backend/                  ← Django REST API
│   ├── carwash/
│   │   ├── settings.py       ← Configuración central
│   │   └── urls.py           ← Rutas raíz (/api/auth/, /api/)
│   ├── apps/
│   │   ├── accounts/         ← Auth, Business, Subscription, Users
│   │   │   ├── models.py     ← Business · Subscription · BusinessUser
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── middleware.py ← Bloqueo HTTP 402 si suscripción vencida
│   │   └── wash/             ← Lógica del negocio
│   │       ├── models.py     ← Client · Vehicle · Employee · WashService · Appointment
│   │       ├── serializers.py
│   │       ├── views.py
│   │       └── urls.py
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                 ← Angular 21 (standalone + signals)
    └── src/app/
        ├── core/
        │   ├── auth/
        │   │   ├── auth.service.ts      ← Signals: user, business, subscriptionStatus
        │   │   └── auth.guard.ts        ← authGuard · subscriptionGuard · guestGuard
        │   ├── interceptors/
        │   │   └── jwt.interceptor.ts   ← Adjunta Bearer token; maneja 401/402
        │   └── models/index.ts          ← Interfaces TypeScript
        ├── features/
        │   ├── auth/login/              ← Pantalla de login
        │   ├── auth/register/           ← Registro de negocio (trial 14 días)
        │   ├── dashboard/               ← Stats del negocio
        │   ├── clients/                 ← CRUD clientes
        │   ├── vehicles/                ← CRUD vehículos
        │   ├── employees/               ← CRUD empleados
        │   ├── services/                ← CRUD servicios
        │   ├── appointments/            ← CRUD citas + cambio de estado
        │   └── subscription/            ← Ver estado · Renovar
        ├── shared/components/shell/     ← Layout con sidebar + banner suscripción
        ├── app.config.ts
        └── app.routes.ts
```

---

## Flujo de Suscripción

```
Registro → Trial 14 días
              ↓
         ¿Activa?
         ├── Sí → Acceso completo
         └── No (expired/suspended)
              ├── API responde HTTP 402
              ├── Middleware Django bloquea endpoints
              ├── Interceptor Angular → redirige a /subscription
              └── subscriptionGuard bloquea rutas protegidas
```

### Estados de suscripción
| Estado | Descripción |
|--------|-------------|
| `trial` | 14 días de prueba al registrarse |
| `active` | Suscripción vigente |
| `expired` | Fecha de vencimiento superada (auto) |
| `suspended` | Suspendida manualmente por el admin |

### Auto-expiración
`Subscription.check_and_update_status()` se llama en:
- `SubscriptionMiddleware` (en cada request)
- Login (serializer)
- `GET /api/auth/me/`

---

## Instalación

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py makemigrations accounts wash
python manage.py migrate
python manage.py createsuperuser   # opcional (superadmin)
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

Abre: http://localhost:4200

---

## Endpoints principales

### Auth (`/api/auth/`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login/` | Login → JWT + info negocio |
| POST | `/auth/register/` | Registro negocio + admin |
| POST | `/auth/refresh/` | Renovar access token |
| GET | `/auth/me/` | Usuario actual + suscripción |
| GET/PUT | `/auth/business/` | Datos del negocio |
| GET/PUT | `/auth/subscription/` | Detalle suscripción |
| POST | `/auth/subscription/renew/` | Renovar 1 mes |

### API (`/api/`)
| Recurso | Ruta |
|---------|------|
| Dashboard | `GET /api/dashboard/` |
| Clientes | `/api/clients/` |
| Vehículos | `/api/vehicles/` |
| Empleados | `/api/employees/` |
| Servicios | `/api/services/` |
| Citas | `/api/appointments/` |

Todos los endpoints filtran automáticamente por el **negocio del usuario autenticado** (multi-tenant seguro).

---

## Variables de entorno (backend)
```
SECRET_KEY=tu-clave-secreta
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

## Próximos pasos sugeridos
- [ ] Integrar pasarela de pago (Stripe / Conekta) para suscripciones reales
- [ ] Notificaciones por WhatsApp/email al vencerse la suscripción
- [ ] Reportes PDF de citas e ingresos
- [ ] Carga de logo del negocio
- [ ] Migrar de SQLite a PostgreSQL en producción
- [ ] Deploy con Docker Compose (Django + Angular + Nginx)
