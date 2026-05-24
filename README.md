# 🚗 CarWash — Fullstack

**Django REST API + Angular 21 + SQLite + Monthly Subscription**

---

## Architecture

```
carwash/
├── backend/                  ← Django REST API
│   ├── carwash/
│   │   ├── settings.py       ← Central configuration
│   │   └── urls.py           ← Root routes (/api/auth/, /api/)
│   ├── apps/
│   │   ├── accounts/         ← Auth, Business, Subscription, Users
│   │   │   ├── models.py     ← Business · Subscription · BusinessUser
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── middleware.py ← HTTP 402 block on expired subscription
│   │   └── wash/             ← Business logic
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
        │   │   └── jwt.interceptor.ts   ← Attaches Bearer token; handles 401/402
        │   └── models/index.ts          ← TypeScript interfaces
        ├── features/
        │   ├── auth/login/              ← Login screen
        │   ├── auth/register/           ← Business registration (14-day trial)
        │   ├── dashboard/               ← Business stats
        │   ├── clients/                 ← Client CRUD
        │   ├── vehicles/                ← Vehicle CRUD
        │   ├── employees/               ← Employee CRUD
        │   ├── services/                ← Service CRUD
        │   ├── appointments/            ← Appointment CRUD + status updates
        │   └── subscription/            ← View status · Renew
        ├── shared/components/shell/     ← Layout with sidebar + subscription banner
        ├── app.config.ts
        └── app.routes.ts
```

---

## Subscription Flow

```
Register → 14-day Trial
              ↓
         Active?
         ├── Yes → Full access
         └── No (expired/suspended)
              ├── API responds HTTP 402
              ├── Django middleware blocks endpoints
              ├── Angular interceptor → redirects to /subscription
              └── subscriptionGuard blocks protected routes
```

### Subscription Statuses
| Status | Description |
|--------|-------------|
| `trial` | 14-day trial period upon registration |
| `active` | Active subscription |
| `expired` | Expiration date passed (auto) |
| `suspended` | Manually suspended by admin |

### Auto-expiration
`Subscription.check_and_update_status()` is called in:
- `SubscriptionMiddleware` (on every request)
- Login (serializer)
- `GET /api/auth/me/`

---

## Installation

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py makemigrations accounts wash
python manage.py migrate
python manage.py createsuperuser   # optional (superadmin)
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

Open: http://localhost:4200

---

## Main Endpoints

### Auth (`/api/auth/`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/login/` | Login → JWT + business info |
| POST | `/auth/register/` | Business + admin registration |
| POST | `/auth/refresh/` | Refresh access token |
| GET | `/auth/me/` | Current user + subscription |
| GET/PUT | `/auth/business/` | Business details |
| GET/PUT | `/auth/subscription/` | Subscription details |
| POST | `/auth/subscription/renew/` | Renew for 1 month |

### API (`/api/`)
| Resource | Route |
|----------|-------|
| Dashboard | `GET /api/dashboard/` |
| Clients | `/api/clients/` |
| Vehicles | `/api/vehicles/` |
| Employees | `/api/employees/` |
| Services | `/api/services/` |
| Appointments | `/api/appointments/` |

All endpoints automatically filter by the **authenticated user's business** (secure multi-tenant).

---

## Environment Variables (backend) ( wip )
```
SECRET_KEY=your-secret-key
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

## Suggested Next Steps
- [ ] Integrate payment gateway (Stripe / Conekta) for real subscriptions
- [ ] WhatsApp/email notifications on subscription expiration
- [ ] PDF reports for appointments and revenue
- [ ] Business logo upload
- [ ] Migrate from SQLite to PostgreSQL in production
- [ ] Deploy with Docker Compose (Django + Angular + Nginx)
