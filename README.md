# 🚗 CarWash — Fullstack

**Django REST API + Angular 21 (zoneless + signals) + SQLite + Monthly Subscription**

Multi-tenant car wash management: clients, vehicles, employees, services and
appointments per business, with JWT auth, role-based access (admin / employee),
a monthly subscription gate, and printable invoices generated from the browser.

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
│   ├── apps/accounts/permissions.py    ← IsAdmin (admin-only endpoints)
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                 ← Angular 21 (standalone + signals, zoneless)
    └── src/
        ├── environments/
        │   ├── environment.ts            ← apiUrl (production)
        │   └── environment.development.ts ← apiUrl (ng serve)
        └── app/
            ├── core/
            │   ├── auth/
            │   │   ├── auth.service.ts      ← Signals: user, business, subscriptionStatus, isAdmin
            │   │   │                           (session persisted in localStorage, survives reload)
            │   │   └── auth.guard.ts        ← authGuard · subscriptionGuard · guestGuard · adminGuard
            │   ├── interceptors/
            │   │   └── jwt.interceptor.ts   ← Attaches Bearer token; handles 401/402
            │   ├── services/api.service.ts  ← Generic typed CRUD client
            │   └── models/index.ts          ← TypeScript interfaces
            ├── features/
            │   ├── auth/login/              ← Login screen
            │   ├── auth/register/           ← Business registration (14-day trial)
            │   ├── dashboard/               ← Business stats
            │   ├── clients/                 ← Client CRUD
            │   ├── vehicles/                ← Vehicle CRUD
            │   ├── employees/               ← Employee profiles CRUD (admin)
            │   ├── users/                   ← Team accounts (login users) CRUD (admin)
            │   ├── services/                ← Service CRUD
            │   ├── appointments/            ← Appointment CRUD + status + printable invoice
            │   └── subscription/            ← View status · Renew (admin)
            ├── shared/components/shell/     ← Layout with role-filtered sidebar + banner
            ├── app.config.ts                ← provideZonelessChangeDetection
            └── app.routes.ts
```

> **Employees vs Team:** `employees/` manages **HR profiles** (assignable to
> appointments, no login). `users/` manages **login accounts** (`BusinessUser`)
> that can sign in to the panel. They are intentionally separate.

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

## Roles & Permissions

Each login account (`BusinessUser`) has a role. Access control is enforced on
**both** the API (real protection) and the UI (navigation + guards).

| Role | Access |
|------|--------|
| `admin` / `superadmin` | Full access, including team, employees and subscription |
| `employee` | Dashboard, appointments, clients, vehicles, services |

**Admin-only modules:** Employees, Team (users) and Subscription.

```
Backend  → IsAdmin permission on the sensitive views (returns HTTP 403)
Frontend → adminGuard on /employees, /users, /subscription (redirects to /dashboard)
         → sidebar hides admin-only items for employees
```

The role is persisted client-side, so `adminGuard` and the menu stay correct
after a full page reload.

### Creating a login account for an employee
The owner (admin) goes to **Team → New user**, sets a username, role and an
**initial password**. The new user can then sign in at `/login` immediately
with those credentials (the password is hashed via `set_password`). Usernames
accept spaces and accents (e.g. `Juan Perez`).

---

## Invoicing (browser print)

Each appointment can produce a **printable invoice** straight from the browser —
no backend call, all data already lives on the appointment.

- In **Appointments**, the **Invoice** button opens a formatted receipt:
  business name, invoice number (`FAC-000123`), issue date, client, vehicle,
  attending employee, itemized services with prices, **total**, and notes.
- **Print** triggers `window.print()` → send to a printer or **Save as PDF**.
- `@media print` rules in `src/styles.css` hide the app chrome (sidebar, tables,
  buttons) so only the invoice is printed.

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
ng serve            # or: npm start
```

Open: http://localhost:4200

The API base URL is configured in `src/environments/`. `ng serve` uses
`environment.development.ts`; production builds use `environment.ts`. Adjust
`apiUrl` if the backend runs on a different host/port (default
`http://localhost:8000/api`).

---

## Main Endpoints

### Auth (`/api/auth/`)
| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| POST | `/auth/login/` | Login → JWT + business info | Public |
| POST | `/auth/register/` | Business + admin registration | Public |
| POST | `/auth/refresh/` | Refresh access token | Public |
| GET | `/auth/me/` | Current user + subscription | Auth |
| GET/PUT | `/auth/business/` | Business details | Auth |
| GET/POST | `/auth/users/` | List / create team login accounts | **Admin** |
| GET/PUT | `/auth/subscription/` | Subscription details | **Admin** |
| POST | `/auth/subscription/renew/` | Renew for 1 month | **Admin** |

### API (`/api/`)
| Resource | Route | Access |
|----------|-------|--------|
| Dashboard | `GET /api/dashboard/` | Auth |
| Clients | `/api/clients/` | Auth |
| Vehicles | `/api/vehicles/` | Auth |
| Employees | `/api/employees/` | **Admin** |
| Services | `/api/services/` | Auth |
| Appointments | `/api/appointments/` | Auth |

All endpoints automatically filter by the **authenticated user's business**
(secure multi-tenant). Endpoints marked **Admin** require an `admin`/`superadmin`
role (`IsAdmin` permission); employees receive HTTP 403.

---

## Environment Variables (backend) ( wip )
```
SECRET_KEY=your-secret-key
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

## DEMO USERS
```
Superadmin for admin panel in django:
User: demosuperadmin
Pwd: 1234

Lavadero Demo
User: DemoAdmin
Pwd: Demo-test123

```

## Suggested Next Steps
- [x] Role-based access control (admin / employee) on API + UI
- [x] Printable per-appointment invoices (browser print / Save as PDF)
- [ ] Add business address / phone / tax ID to the invoice header
- [ ] Integrate payment gateway (Stripe / Conekta) for real subscriptions
- [ ] WhatsApp/email notifications on subscription expiration
- [ ] PDF reports for revenue (monthly summaries)
- [ ] Business logo upload
- [ ] Migrate from SQLite to PostgreSQL in production
- [ ] Deploy with Docker Compose (Django + Angular + Nginx)
