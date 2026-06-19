# PROJECT_CONTEXT.md

> Exhaustive context document for continuing the Parking Management Project in a fresh session with zero prior conversation history.  
> Last updated to reflect the state after: initial architecture analysis, project scaffolding files, JWT auth, active vehicles API integration, live dashboard charts, reporting system, and parking spot assignment.

---

## Project Overview

This is a **Persian (Farsi) RTL parking management admin system** for operating a physical parking facility. It was originally exported from **Figma Make** (`@figma/my-make-file`) as a polished UI prototype and has been progressively wired to a real **Django REST API** backend.

### Who uses it

| Role (Persian) | Role (English) | Intended use |
|----------------|----------------|----------------|
| **مدیر** | Manager | Full admin access including user management |
| **اپراتور** | Operator | Day-to-day parking operations (entry, exit, shifts, tariffs) |
| **کاربر** | User | General user role (defined in schema; limited enforcement so far) |
| Django **superuser** | System admin | Django admin + treated as manager for API permissions |

### Core purpose

The system supports the full operational loop of a parking lot:

1. **Authenticate** staff via JWT login
2. **Register vehicle entry** with plate number, tariff (vehicle type), and parking spot assignment
3. **Track active vehicles** currently inside the lot
4. **Register vehicle exit** with automatic fee calculation based on tariff and duration
5. **Manage parking spots** (availability, occupancy status)
6. **Manage tariffs** (pricing per vehicle type)
7. **Manage operator shifts** (start/end with statistics)
8. **Manage users** (manager-only)
9. **View dashboard** live stats and charts
10. **View reports** (revenue, traffic, occupancy) with date range filters

The UI language is Persian throughout. The backend timezone is **`Asia/Tehran`**.

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ (project tested on 3.10) | Runtime |
| Django | 5.2.15 | Web framework |
| Django REST Framework | 3.17.1 | REST API |
| django-cors-headers | 4.9.0 | CORS for Vite dev server |
| djangorestframework-simplejwt | 5.5.0 | JWT authentication |
| PyJWT | 2.9.0 (transitive) | JWT encoding |
| SQLite | via Django backend | Database (`db.sqlite3`) |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 (peer dependency) | UI library |
| Vite | 6.3.5 | Build tool / dev server |
| TypeScript | Used in `.tsx` files (transpiled by Vite; **no root `tsconfig.json`**) | Type syntax |
| react-router | 7.13.0 | Client-side routing |
| Tailwind CSS | 4.1.12 | Styling (via `@tailwindcss/vite`) |
| shadcn/ui + Radix UI | Various `@radix-ui/*` packages | UI component primitives |
| recharts | 2.15.2 | Charts (dashboard, reports) |
| lucide-react | 0.487.0 | Icons |
| sonner | 2.0.3 | Toast notifications |
| motion | 12.23.24 | Animations (login, entry success) |
| next-themes | 0.4.6 | Light/dark theme toggle |
| pnpm | Lockfile present (`pnpm-lock.yaml`) | Package manager |

### Unused / dead frontend dependencies (installed but not imported in `src/`)

- `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
- `react-dnd`, `react-dnd-html5-backend`, `react-slick`, and others from Figma Make export

### Tooling / infra

- No Docker, no CI/CD, no test runner configured
- No `pyproject.toml` / Poetry — Python deps in `requirements.txt` only
- Virtual environment expected at `venv/` (gitignored)

---

## Architecture

### Repository layout

```
Parking-Management-Project/
├── manage.py                      # Django CLI entry
├── requirements.txt               # Python dependencies (pinned)
├── README.md                      # Setup instructions (partially outdated — see Known Issues)
├── .gitignore                     # Ignores venv, db, node_modules, .env, dist
├── PROJECT_CONTEXT.md             # This file
├── db.sqlite3                     # SQLite database (gitignored, created by migrate)
├── venv/                          # Python virtualenv (gitignored)
│
├── parking_backend/               # Django project config
│   ├── settings.py                # Settings, JWT, CORS, REST_FRAMEWORK
│   ├── urls.py                    # Root URLs: /admin/, /api/
│   ├── wsgi.py / asgi.py
│
├── parking_api/                   # Single Django app (all business logic)
│   ├── models.py                  # Tariff, VehicleTraffic, ParkingSpot, OperatorShift, UserProfile
│   ├── views.py                   # All APIView endpoints
│   ├── serializers.py             # DRF serializers
│   ├── urls.py                    # API route definitions
│   ├── auth_views.py              # Login, refresh, logout, me
│   ├── auth_serializers.py        # Custom JWT login serializer with user payload
│   ├── permissions.py             # IsManager role permission
│   ├── spot_services.py           # Parking spot assign/release logic
│   ├── dashboard_analytics.py     # Dashboard chart query logic
│   ├── report_analytics.py        # Reports query logic
│   ├── admin.py                   # Registers Tariff, VehicleTraffic only
│   ├── tests.py                   # Empty placeholder
│   └── migrations/                # 0001–0007 (see Database Schema section)
│
└── parking_frontend/              # React SPA
    ├── .env                       # VITE_API_URL (gitignored by pattern .env)
    ├── package.json
    ├── vite.config.ts             # Vite + React + Tailwind; @ alias to src
    ├── index.html
    └── src/
        ├── main.tsx               # Entry point
        ├── app/
        │   ├── App.tsx            # Router + AuthProvider + ProtectedRoute
        │   ├── pages/             # 11 page components (one per route)
        │   ├── components/        # Layout, sidebar, topbar, feature components
        │   │   └── ui/            # ~40 shadcn/ui primitives
        │   ├── context/
        │   │   └── auth-context.tsx
        │   └── lib/
        │       ├── api.ts         # JWT-aware HTTP client
        │       ├── auth-storage.ts
        │       ├── utils.ts       # cn(), formatCurrency, formatDuration, etc.
        │       └── mock-data.ts   # Legacy mock types/data (still used for types in some components)
        └── styles/                # Tailwind + CSS variables (RTL theme)
```

### How frontend, backend, and database connect

```
┌─────────────────────────────────────────────────────────────────┐
│  React SPA (Vite, port 5173)                                    │
│  http://localhost:5173                                          │
│                                                                 │
│  AuthProvider → auth-storage (localStorage / sessionStorage)    │
│  api.ts → fetch with Bearer JWT + auto-refresh on 401           │
│  Base URL: VITE_API_URL (default http://127.0.0.1:8000)         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP JSON
                            │ Authorization: Bearer <access_token>
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Django REST API (port 8000)                                    │
│  http://127.0.0.1:8000/api/                                     │
│                                                                 │
│  JWTAuthentication (default)                                    │
│  IsAuthenticated (default permission)                           │
│  AllowAny only on login + refresh                               │
│  IsManager on /api/users/ endpoints only                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Django ORM
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  SQLite — db.sqlite3                                            │
│  Tables: auth_*, parking_api_*, token_blacklist_*               │
└─────────────────────────────────────────────────────────────────┘
```

### Backend architectural pattern

- **Single Django app** (`parking_api`) — no service-layer split beyond:
  - `spot_services.py` — spot assignment
  - `dashboard_analytics.py` — dashboard charts
  - `report_analytics.py` — reports
- **Plain DRF `APIView` subclasses** — not ViewSets/routers
- **Business logic mostly inline in views** except analytics and spot services
- **No API versioning** — all endpoints under `/api/`

### Frontend architectural pattern

- **No global state library** (no Redux, Zustand, React Query)
- **Local `useState` + `useEffect` per page** for data fetching
- **AuthContext** for login state, user object, login/logout functions
- **ProtectedRoute** wrapper for all dashboard routes
- **Centralized API client** (`api.ts`) with JWT injection and refresh
- **One page component per route** — pages own their fetch/mutate logic
- **shadcn/ui + Tailwind** design system, **RTL** (`dir="rtl"` on layout/login)

### Frontend routes

| Path | Page component | Auth required | Data source |
|------|----------------|---------------|-------------|
| `/` | `LoginPage` | No (redirects to `/dashboard` if logged in) | JWT login API |
| `/dashboard` | `DashboardPage` | Yes | `/api/dashboard-stats/`, `/api/dashboard-charts/` |
| `/vehicle-entry` | `VehicleEntryPage` | Yes | `/api/tariffs/`, `/api/parking-spots/`, POST `/api/vehicle-entry/` |
| `/vehicle-exit` | `VehicleExitPage` | Yes | `/api/active-vehicles/`, POST `/api/vehicle-exit/` |
| `/active-vehicles` | `ActiveVehiclesPage` | Yes | `/api/active-vehicles/` |
| `/parking-spots` | `ParkingSpotsPage` | Yes | `/api/parking-spots/` |
| `/users` | `UsersPage` | Yes (API enforces manager for mutations/list) | `/api/users/` |
| `/tariffs` | `TariffsPage` | Yes | `/api/tariffs/` |
| `/shifts` | `ShiftsPage` | Yes | `/api/shifts/`, `/api/shifts/start/`, `/api/shifts/end/` |
| `/reports` | `ReportsPage` | Yes | `/api/reports/` |
| `/settings` | `SettingsPage` | Yes | **Static/mock only** (toast on save) |
| `*` | Redirect to `/` | — | — |

---

## Database Schema

### Django built-in tables (used)

- `auth_user` — Django User model (username, password hash, email, first_name, last_name, is_active, last_login, etc.)
- `auth_group`, `auth_permission`, etc. — standard Django auth (not actively used for RBAC)
- `django_session`, `django_content_type`, `django_migrations`, `django_admin_log`
- `token_blacklist_outstandingtoken`, `token_blacklist_blacklistedtoken` — JWT refresh token blacklist

### Custom application tables

#### `parking_api_tariff`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | BigAutoField | PK | |
| `name` | CharField(100) | UNIQUE | Vehicle type name, e.g. `"سواری"`, `"وانت"`, `"موتور"`, `"کامیون"` |
| `base_rate` | DecimalField(12, 0) | | First hour / entry fee in Toman |
| `hourly_rate` | DecimalField(12, 0) | | Additional hour fee in Toman |
| `is_active` | BooleanField | default=True | Only active tariffs returned by GET `/api/tariffs/` |

#### `parking_api_vehicletraffic`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | BigAutoField | PK | Used as `traffic_id` on exit |
| `plate_number` | CharField(50) | | Full plate string, Persian format |
| `entry_time` | DateTimeField | auto_now_add=True | Set on creation |
| `exit_time` | DateTimeField | null=True, blank=True | Set on exit |
| `tariff_id` | FK → Tariff | on_delete=PROTECT | |
| `parking_spot_id` | FK → ParkingSpot | null=True, blank=True, on_delete=SET_NULL, related_name=`vehicle_sessions` | Added in migration 0006; required for new entries |
| `total_cost` | DecimalField(12, 0) | default=0 | Calculated on exit |
| `is_inside` | BooleanField | default=True | False after exit |

**No unique constraint** on `plate_number` while `is_inside=True` — duplicate active plates are technically possible (known issue).

#### `parking_api_parkingspot`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | BigAutoField | PK | |
| `spot_number` | CharField(10) | UNIQUE | e.g. `"A-1"`, `"B-3"` (seeded A-1 through E-10) |
| `status` | CharField(20) | choices=STATUS_CHOICES, default=`available` | See enums below |
| `floor` | IntegerField | default=0 | Seeded as `1` |

**STATUS_CHOICES (ParkingSpot.status):**

| Value | Persian label |
|-------|---------------|
| `available` | آزاد |
| `occupied` | اشغال |
| `reserved` | رزرو |
| `disabled` | غیرفعال |

**Seeded data (migration 0007):** 50 spots with numbers `A-1` … `A-10`, `B-1` … `B-10`, … `E-1` … `E-10`, all initially `status=available`, `floor=1`. Only runs if table is empty.

#### `parking_api_operatorshift`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | BigAutoField | PK | |
| `operator_id` | FK → User | null=True, blank=True, on_delete=SET_NULL | Not linked to logged-in user yet |
| `operator_name_fallback` | CharField(100) | default=`"اپراتور سیستم"` | Used when operator FK is null |
| `start_time` | DateTimeField | auto_now_add=True | |
| `end_time` | DateTimeField | null=True, blank=True | |
| `status` | CharField(15) | choices=SHIFT_STATUS, default=`active` | |
| `revenue` | DecimalField(12, 0) | default=0 | **Hardcoded on end** (known issue) |
| `vehicles_entered` | IntegerField | default=0 | **Hardcoded on end** |
| `vehicles_exited` | IntegerField | default=0 | **Hardcoded on end** |

**SHIFT_STATUS (OperatorShift.status):**

| Value | Persian label |
|-------|---------------|
| `active` | فعال |
| `completed` | پایان یافته |

#### `parking_api_userprofile`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | BigAutoField | PK | |
| `user_id` | OneToOne → User | on_delete=CASCADE, related_name=`profile` | |
| `phone` | CharField(15) | null=True, blank=True | Also used as Django username on user create |
| `role` | CharField(20) | choices=ROLE_CHOICES, default=`اپراتور` | |

**ROLE_CHOICES (UserProfile.role):**

| Value | Meaning |
|-------|---------|
| `مدیر` | Manager — required for `/api/users/` access |
| `اپراتور` | Operator |
| `کاربر` | General user |

### Relationships diagram

```
User (django.contrib.auth)
  ├── 1:1 → UserProfile
  └── 1:N → OperatorShift (nullable FK)

Tariff
  └── 1:N → VehicleTraffic

ParkingSpot
  └── 1:N → VehicleTraffic (nullable FK, related_name=vehicle_sessions)

VehicleTraffic
  ├── N:1 → Tariff (PROTECT)
  └── N:1 → ParkingSpot (SET_NULL, optional for legacy records)
```

### Indexes

No custom indexes defined beyond Django defaults (PKs, unique constraints on `Tariff.name`, `ParkingSpot.spot_number`).

### Migrations (applied in order)

| # | File | What it does |
|---|------|--------------|
| 0001 | `0001_initial.py` | Creates Tariff, VehicleTraffic |
| 0002 | `0002_alter_tariff_...py` | Persian verbose names, decimal precision |
| 0003 | `0003_parkingspot.py` | Creates ParkingSpot |
| 0004 | `0004_operatorshift.py` | Creates OperatorShift |
| 0005 | `0005_userprofile.py` | Creates UserProfile |
| 0006 | `0006_vehicletraffic_parking_spot.py` | Adds nullable FK parking_spot on VehicleTraffic |
| 0007 | `0007_seed_parking_spots.py` | Data migration: seeds 50 parking spots if empty |

Also applied: Django admin/auth migrations + `token_blacklist` migrations (12 blacklist migrations).

### Hardcoded constants in code (not in DB)

| Constant | Value | Where used |
|----------|-------|------------|
| `TOTAL_SPOTS` | `40` | `dashboard_analytics.py`, `DashboardStatsAPI`, `DashboardChartsAPI`, `ReportsAPI` |
| Seeded spots count | `50` | Migration 0007 |
| Temporary user password | `"TemporaryPassword123!"` | UserManagementAPI POST |
| EndShift fake stats | revenue=450000, entered=18, exited=12 | EndShiftAPI |

**Capacity inconsistency:** Dashboard/reports assume 40 total spots; database has 50 seeded spots. This is a known issue.

---

## API Endpoints / Routes

**Base URL:** `http://127.0.0.1:8000/api/`  
**Default auth:** JWT Bearer token required on all endpoints except login and refresh.  
**Obtain token:** `Authorization: Bearer <access_token>`

### Authentication

#### `POST /api/auth/login/` — **AllowAny**

**Input:**
```json
{
  "username": "09121234567",
  "password": "your-password"
}
```
- `username` is Django username (for created users, username = phone number)
- Login field label in UI: **"شماره تماس / نام کاربری"**

**Output (200):**
```json
{
  "access": "<jwt_access_token>",
  "refresh": "<jwt_refresh_token>",
  "user": {
    "id": 1,
    "username": "soroush",
    "name": "soroush",
    "email": "...",
    "role": "مدیر",
    "phone": "09121234567",
    "last_login": "2026-06-12T15:15:17+03:30",
    "is_active": true,
    "avatar": "so"
  }
}
```
- `role` and `phone` come from `UserProfile`; null if no profile (e.g. bare superuser)

**Errors:** 401 with `{"detail": "..."}` for invalid credentials

---

#### `POST /api/auth/refresh/` — **AllowAny**

**Input:**
```json
{ "refresh": "<jwt_refresh_token>" }
```

**Output (200):**
```json
{ "access": "<new_access_token>" }
```

---

#### `POST /api/auth/logout/` — **IsAuthenticated**

**Input:**
```json
{ "refresh": "<jwt_refresh_token>" }
```

**Output (200):**
```json
{ "detail": "logged out" }
```
- Blacklists the refresh token server-side

---

#### `GET /api/auth/me/` — **IsAuthenticated**

**Output (200):** Same user object shape as login `user` field

---

### Tariffs

#### `GET /api/tariffs/` — **IsAuthenticated**

**Output (200):** Array of tariff objects
```json
[
  {
    "id": 1,
    "name": "سواری",
    "base_rate": "50000",
    "hourly_rate": "30000",
    "is_active": true
  }
]
```
- Only `is_active=True` tariffs returned

---

#### `PUT /api/tariffs/` — **IsAuthenticated**

**Input:**
```json
{
  "id": 1,
  "base_rate": "50000",
  "hourly_rate": "30000"
}
```

**Output (200):** Updated tariff object  
**Errors:** 404 `{"error": "تعرفه مورد نظر یافت نشد"}`, 400 validation errors

---

### Vehicle entry / exit / active

#### `POST /api/vehicle-entry/` — **IsAuthenticated**

**Input:**
```json
{
  "plate_number": "12 الف 345 ایران 67",
  "tariff": 1,
  "parking_spot": 5
}
```
- `parking_spot` is **required** (integer PK of ParkingSpot)
- `parking_spot` is stripped from serializer payload and handled separately via `spot_services`

**Behavior:**
1. Creates `VehicleTraffic` with `is_inside=True`
2. Atomically assigns spot via `select_for_update()`
3. Sets spot `status=occupied`
4. Rejects if spot not `available` or already assigned to inside vehicle

**Output (201):** Full `VehicleTrafficSerializer` response (see serializer fields below)

**Errors:**
- 400 `{"error": "انتخاب جایگاه پارکینگ الزامی است."}`
- 400 `{"error": "این جایگاه در حال حاضر قابل اختصاص نیست."}`
- 404 `{"error": "جایگاه پارکینگ یافت نشد."}`

---

#### `GET /api/active-vehicles/` — **IsAuthenticated**

**Output (200):** Array of inside vehicles, ordered by `-entry_time`, with `select_related('tariff', 'parking_spot')`

---

#### `POST /api/vehicle-exit/` — **IsAuthenticated**

**Input:**
```json
{ "traffic_id": 3 }
```

**Behavior:**
1. Finds vehicle with `is_inside=True`
2. Sets `exit_time=now()`
3. Calculates fee (see Fee formula below)
4. Sets `is_inside=False`
5. Calls `release_parking_spot()` → spot `status=available`

**Output (200):** Updated VehicleTraffic object with `total_cost` populated

**Errors:** 404 `{"error": "خودرو یافت نشد یا قبلاً خارج شده است"}`

**Fee formula:**
```
duration = exit_time - entry_time
hours_to_charge = ceil(duration in hours), minimum 1
if hours_to_charge == 1:
    total_cost = tariff.base_rate
else:
    total_cost = tariff.base_rate + (hours_to_charge - 1) * tariff.hourly_rate
```

---

### Parking spots

#### `GET /api/parking-spots/` — **IsAuthenticated**

**Output (200):** Array from real `ParkingSpot` table, ordered by `spot_number`
```json
[
  {
    "id": 1,
    "spot_number": "A-1",
    "status": "available",
    "floor": 1,
    "license_plate": "12 الف 345 ایران 67"
  }
]
```
- `license_plate` is **dynamically added** (not a model field) for occupied spots with an active vehicle

---

### Dashboard

#### `GET /api/dashboard-stats/` — **IsAuthenticated**

**Output (200):**
```json
{
  "total_spots": 40,
  "vehicles_inside": 3,
  "available_spots": 37,
  "today_income": 450000
}
```
- `today_income` = sum of `total_cost` for exits today
- `total_spots` hardcoded to 40

---

#### `GET /api/dashboard-charts/` — **IsAuthenticated**

**Output (200):**
```json
{
  "weekly_revenue": [
    { "name": "شنبه", "revenue": 0 }
  ],
  "vehicle_types": [
    { "name": "سواری", "value": 2 }
  ],
  "traffic_today": [
    { "hour": "08:00", "entries": 0, "exits": 0 }
  ],
  "occupancy_trend": [
    { "month": "2026-01-01", "rate": 12 }
  ]
}
```

**Chart logic:**
- `weekly_revenue`: last 7 days exit revenue by day; weekday names in Persian
- `vehicle_types`: count of currently inside vehicles by tariff name
- `traffic_today`: entry/exit counts at hours 8,10,12,14,16,18 today
- `occupancy_trend`: average daily occupancy % for last 6 months; `month` is ISO date string of month start

---

### Reports

#### `GET /api/reports/` — **IsAuthenticated**

**Query parameters:**

| Param | Values | Default |
|-------|--------|---------|
| `range` | `today`, `week`, `month`, `year`, `custom` | `week` |
| `start_date` | ISO date `YYYY-MM-DD` | Required if `range=custom` |
| `end_date` | ISO date `YYYY-MM-DD` | Required if `range=custom` |
| `vehicle_type` | `all`, `سواری`, `وانت`, `موتور`, `کامیون` | `all` |

**Output (200):**
```json
{
  "filters": {
    "range": "week",
    "start_date": "2026-06-10",
    "end_date": "2026-06-16",
    "vehicle_type": "all"
  },
  "revenue": {
    "trend": [{ "date": "2026-06-10", "amount": 450000 }],
    "summary": {
      "total_revenue": 1450000,
      "daily_average": 207142.857,
      "peak_amount": 450000,
      "peak_date": "2026-06-15"
    }
  },
  "traffic": {
    "vehicle_types": [{ "name": "سواری", "value": 12 }]
  },
  "occupancy": {
    "hourly_rates": [{ "hour": "08:00", "rate": 45 }]
  }
}
```

**Occupancy hours in reports:** 8, 10, 12, 14, 16, 18, 20, 22 (average rate across days in range)

**Errors:** 400 `{"error": "..."}` for invalid range or missing custom dates

**Not wired from frontend:** `operator` filter (UI exists but not sent to API — no operator on VehicleTraffic model)

---

### Shifts

#### `GET /api/shifts/` — **IsAuthenticated**

**Output (200):** Array of all shifts (active + completed), ordered by `-start_time`

**OperatorShift object includes:** `id`, `operator`, `operator_name_fallback`, `start_time`, `end_time`, `status`, `revenue`, `vehicles_entered`, `vehicles_exited`, computed `operator_name`

---

#### `POST /api/shifts/start/` — **IsAuthenticated**

**Input:** Empty body

**Output (201):** New shift object with `status=active`  
**Errors:** 400 if active shift already exists

---

#### `POST /api/shifts/end/` — **IsAuthenticated**

**Input:** Empty body

**Output (200):** Completed shift with **hardcoded** revenue/entry/exit stats  
**Errors:** 404 if no active shift

---

### Users (Manager only)

#### `GET /api/users/` — **IsAuthenticated + IsManager**

**Output (200):** Array of user objects with profile fields

---

#### `POST /api/users/` — **IsAuthenticated + IsManager**

**Input:**
```json
{
  "name": "علی احمدی",
  "phone": "09121234567",
  "role": "اپراتور",
  "is_active": true
}
```

**Behavior:**
- Creates Django User with `username=phone`, `first_name=name`
- Password set to **`TemporaryPassword123!"`** (hardcoded)
- Creates UserProfile with phone and role

**Output (201):** `{"success": "کاربر با موفقیت ایجاد شد"}`

---

#### `DELETE /api/users/<pk>/` — **IsAuthenticated + IsManager**

**Output (200):** `{"success": "کاربر با موفقیت حذف شد"}`

---

### VehicleTrafficSerializer response shape (used by entry, exit, active-vehicles)

```json
{
  "id": 1,
  "plate_number": "12 الف 345 ایران 67",
  "entry_time": "2026-06-16T10:30:00+03:30",
  "exit_time": null,
  "entry_time_formatted": "10:30",
  "exit_time_formatted": "",
  "tariff": 1,
  "tariff_details": {
    "id": 1,
    "name": "سواری",
    "base_rate": "50000",
    "hourly_rate": "30000",
    "is_active": true
  },
  "parking_spot": 5,
  "parking_spot_details": {
    "id": 5,
    "spot_number": "A-5",
    "status": "occupied",
    "floor": 1
  },
  "total_cost": "0",
  "is_inside": true
}
```

### Django Admin

- URL: `http://127.0.0.1:8000/admin/`
- Registered models: **Tariff**, **VehicleTraffic** only
- Not registered: ParkingSpot, OperatorShift, UserProfile

---

## Key Decisions & Rationale

### 1. Monolithic single Django app (`parking_api`)

**Decision:** All backend logic in one app, not split into `users`, `billing`, `spots` apps.  
**Why:** Project scope is small; single app reduces overhead.  
**Rejected:** Multi-app Django structure — unnecessary complexity for current size.

### 2. Plain DRF APIView instead of ViewSets

**Decision:** Each endpoint is a standalone `APIView` class.  
**Why:** Matches incremental development from prototype; explicit per-endpoint logic.  
**Rejected:** DRF routers/ViewSets — would require refactor of working endpoints.

### 3. SQLite for database

**Decision:** SQLite at `db.sqlite3` for development/demo.  
**Why:** Zero config, sufficient for prototype and single-operator deployment.  
**Rejected:** PostgreSQL — not needed yet; noted for production roadmap.

### 4. JWT via djangorestframework-simplejwt

**Decision:** JWT with access + refresh tokens; blacklist on logout.  
**Why:** Standard DRF approach; SPA-friendly; user approved this approach.  
**Rejected:** Session-only auth — harder for decoupled SPA; session cookies need same-origin strategy.

**Approved token settings:**
- Access token: **15 minutes**
- Refresh token: **7 days**
- Remember me checked → `localStorage`; unchecked → `sessionStorage`
- Logout blacklists refresh token

### 5. Global IsAuthenticated + IsManager only on user endpoints

**Decision:** `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`; only `/api/users/` adds `IsManager`.  
**Why:** User approved basic role-based protection now; operational endpoints open to all authenticated users.  
**Rejected (for now):** Full RBAC per route (e.g. operators can't edit tariffs) — deferred.

**IsManager rule:** Role must be `"مدیر"` OR user is Django superuser.

### 6. Username = phone for created users

**Decision:** `UserManagementAPI` sets `username=data['phone']`.  
**Why:** Matches Persian UI pattern; phone is natural login identifier.  
**Rejected:** Separate username field — UI doesn't collect it.

### 7. Temporary hardcoded password on user creation

**Decision:** All API-created users get password `"TemporaryPassword123!"`.  
**Why:** Quick prototype; no password reset flow built yet.  
**Rejected:** Random password email flow — not implemented.

### 8. Centralized frontend API client with JWT refresh

**Decision:** `src/app/lib/api.ts` wraps all fetch calls; auto-retries once on 401 after refresh.  
**Why:** Avoid duplicating auth headers across 7+ pages; single refresh logic.  
**Rejected:** Per-page raw fetch — was original state; replaced during JWT implementation.

### 9. Separate analytics modules for dashboard and reports

**Decision:** `dashboard_analytics.py` and `report_analytics.py` instead of inline view logic.  
**Why:** Testable; keeps views thin; dashboard and reports have different time scopes.  
**Rejected:** Single mega analytics file — separated for clarity when reports were added.

### 10. Single `/api/reports/` endpoint vs three endpoints

**Decision:** One endpoint returns revenue + traffic + occupancy together.  
**Why:** Matches UI where one filter apply button loads all three tabs; one round trip.  
**Rejected:** `/api/reports/revenue/`, etc. — more HTTP calls for same filter context.

### 11. ParkingSpot as real DB entity with FK on VehicleTraffic

**Decision:** Migration 0006 adds FK; migration 0007 seeds 50 spots; assign on entry, release on exit.  
**Why:** User requirement; spot picker was cosmetic before; needed persistence and occupancy prevention.  
**Rejected:** Continue dynamic spot generation from vehicle count — doesn't support real assignment.

**Spot assignment uses `select_for_update()`** inside transaction to prevent race double-booking.

### 12. Seed spot numbering A-1 … E-10 (50 spots)

**Decision:** Match original Figma mock format (`A-1`, `B-3`, etc.).  
**Why:** Keep UI labels consistent when switching from mock to API data.  
**Rejected:** `P-01` format used by old dynamic ParkingSpotsListAPI — replaced with real DB spots.

### 13. Keep UI visually unchanged during API integrations

**Decision:** Multiple tasks explicitly required keeping existing chart layouts, forms, and page structure; only wire data sources.  
**Why:** Figma Make UI is production-quality; focus on backend integration.  
**Implication:** Some UI elements remain cosmetic (settings, export buttons, operator dropdowns, comparison % subtitles on reports).

### 14. Hardcoded TOTAL_SPOTS = 40 in analytics

**Decision:** Dashboard stats/charts and reports use 40 as capacity constant.  
**Why:** Inherited from original `DashboardStatsAPI` comment ("ظرفیت ۴۰").  
**Problem:** Seeded 50 spots — inconsistency not yet resolved (see Known Issues).

### 15. No tests added

**Decision:** No backend or frontend tests written during integration work.  
**Why:** Not requested; focus on feature delivery.  
**Status:** `parking_api/tests.py` remains empty.

---

## Conventions

### Backend (Python/Django)

- **Language for user-facing API errors:** Persian strings in `{"error": "..."}` or serializer errors
- **Comments in code:** Mixed Persian and English (legacy from original developer)
- **Views:** One class per endpoint; named `{Feature}API`
- **URLs:** kebab-case paths (`vehicle-entry/`, `dashboard-stats/`, `auth/login/`)
- **Permissions:** Explicit `permission_classes` only when overriding defaults (user endpoints)
- **Transactions:** Used for spot assignment (`transaction.atomic` + `select_for_update`)
- **Time:** `USE_TZ=True`, `TIME_ZONE='Asia/Tehran'`
- **Money:** Decimal fields, integer Toman (no fractional currency)
- **Serializers:** Nested read-only details pattern (`tariff_details`, `parking_spot_details`)

### Frontend (TypeScript/React)

- **File naming:** kebab-case files (`vehicle-entry-page.tsx`, `auth-context.tsx`)
- **Component naming:** PascalCase exports (`VehicleEntryPage`)
- **Page structure:** One page file per route in `src/app/pages/`
- **Imports:** Relative paths (Vite `@` alias configured but **not used** in imports)
- **API calls:** Use `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiFetch` from `lib/api.ts` — not raw fetch (except login in auth-context)
- **Error UX:** `sonner` toast for errors; Persian messages
- **Loading UX:** `Loader2` spinner from lucide-react
- **Styling:** Tailwind utility classes; CSS variables in `styles/theme.css`
- **RTL:** `dir="rtl"` on login and dashboard layout
- **Currency display:** `formatCurrency()` using `Intl.NumberFormat("fa-IR", { currency: "IRR" })`
- **Date display:** `Intl.DateTimeFormat("fa-IR", ...)` including `calendar: "persian"` where needed

### Git / project

- `db.sqlite3`, `venv/`, `node_modules/`, `.env` are gitignored
- No commit conventions documented
- README exists but is partially stale

---

## Completed Features

### Project scaffolding
- [x] `requirements.txt` with pinned Python deps
- [x] `.gitignore` for Python, Django, Node, env files
- [x] `README.md` with setup instructions (needs auth section update)

### Authentication & authorization
- [x] JWT login (`POST /api/auth/login/`) with user payload in response
- [x] JWT refresh (`POST /api/auth/refresh/`)
- [x] JWT logout with refresh token blacklist (`POST /api/auth/logout/`)
- [x] Current user endpoint (`GET /api/auth/me/`)
- [x] Global API authentication (IsAuthenticated default)
- [x] Manager-only user management (`IsManager` on `/api/users/`)
- [x] Frontend AuthProvider, auth-storage (localStorage/sessionStorage remember me)
- [x] Frontend ProtectedRoute on all dashboard pages
- [x] Frontend login wired to real API; label "شماره تماس / نام کاربری"
- [x] Sidebar shows real logged-in user; logout calls API
- [x] Centralized JWT api client with auto-refresh

### Core parking operations
- [x] Tariff list and update (GET/PUT `/api/tariffs/`)
- [x] Vehicle entry with tariff (POST `/api/vehicle-entry/`)
- [x] Vehicle exit with fee calculation (POST `/api/vehicle-exit/`)
- [x] Active vehicles list (GET `/api/active-vehicles/`)
- [x] **Parking spot assignment on entry** with occupied-spot prevention
- [x] **Automatic spot release on exit** (status → available)
- [x] Parking spots list from real DB (GET `/api/parking-spots/`)
- [x] 50 parking spots seeded in DB

### Dashboard & analytics
- [x] Dashboard stat cards from API (`/api/dashboard-stats/`)
- [x] Dashboard charts from API (`/api/dashboard-charts/`) — revenue, vehicle types, traffic, occupancy trend
- [x] Reports system (`/api/reports/`) — revenue, traffic, occupancy with date range + vehicle type filters
- [x] Reports page wired to API (apply filter button)

### User & shift management
- [x] User list/create/delete (manager only)
- [x] Shift list/start/end

### Frontend pages wired to API

| Page | Status |
|------|--------|
| Login | Live API |
| Dashboard | Live API (stats + charts) |
| Vehicle Entry | Live API (tariffs, spots, entry) |
| Vehicle Exit | Live API |
| Active Vehicles | Live API (including spot from `parking_spot_details`) |
| Parking Spots | Live API |
| Users | Live API |
| Tariffs | Live API |
| Shifts | Live API |
| Reports | Live API |
| Settings | **Static UI only** |

### Migrations
- [x] All 7 parking_api migrations created and applied
- [x] token_blacklist migrations applied

### Build verification (last known)
- [x] `python manage.py check` — passes
- [x] `pnpm run build` — passes (~1 MB JS bundle)

---

## In-Progress Work

**Nothing is actively in progress.** The last completed task was **parking spot assignment** (migrations 0006/0007, spot_services, vehicle-entry and active-vehicles integration).

There is no half-finished branch or uncommitted work documented in the conversation.

---

## Known Issues / Bugs

### Security / production blockers

1. **`DEBUG=True`** and hardcoded **`SECRET_KEY`** in `settings.py` — not production safe
2. **`ALLOWED_HOSTS=[]`** — will reject non-local Host headers
3. **User creation uses predictable password** `"TemporaryPassword123!"` — security risk
4. **No HTTPS, rate limiting, or env-var secrets** configured
5. **JWT tokens in localStorage/sessionStorage** — XSS exposure (accepted for internal admin SPA)

### Data integrity

6. **No duplicate plate prevention** — same plate can enter twice while `is_inside=True`
7. **Capacity inconsistency** — dashboard/reports use `total_spots=40`; DB has **50** seeded spots; old ParkingSpotsListAPI used 50 dynamically
8. **Legacy VehicleTraffic records** may have `parking_spot=NULL` (pre-migration entries)
9. **EndShiftAPI hardcodes stats** (revenue=450000, entered=18, exited=12) instead of computing from traffic
10. **Shift not linked to logged-in operator** — `OperatorShift.operator` FK usually null; uses fallback name
11. **Vehicle entry not linked to active shift** — no FK from VehicleTraffic to OperatorShift

### Frontend / UX gaps (UI present but not functional)

12. **Settings page** — all tabs are static; save shows toast only; no API
13. **Reports export buttons** (PDF/Excel/Print) — toast only, no export
14. **Reports "custom" date range** — UI option exists; shows error toast ("تاریخ شروع و پایان در نسخه بعدی"); no date pickers
15. **Reports operator filter** — UI dropdown with mock names; not sent to API
16. **Reports comparison subtitles** ("↑ 12% نسبت به هفته قبل") — still **static mock text**, not computed
17. **Dashboard stat cards** — "ورود امروز" shows `vehicles_inside` (not today's entries); "اپراتورهای فعال" hardcoded `"1"`
18. **Topbar** — search non-functional; "شیفت فعال" badge always shown without checking shift API
19. **Vehicle entry operator field** — hardcoded `"علی احمدی"`, not logged-in user
20. **Active vehicles action buttons** (Eye, DoorOpen) — no click handlers
21. **Forgot password** link on login — no action

### Technical debt

22. **No `tsconfig.json`** in frontend — no strict TypeScript checking
23. **No tests** — backend `tests.py` empty; no frontend tests
24. **README outdated** — still says "Authentication: Not yet enforced"
25. **Unused MUI/Emotion dependencies** in package.json
26. **No pagination** on list endpoints
27. **Superuser without UserProfile** gets `role: null` in API — works but incomplete
28. **Django admin** missing ParkingSpot, OperatorShift, UserProfile registration
29. **mock-data.ts** still exists — used for TypeScript types (`ParkingSpot`) in components; mock vehicles/users no longer used on pages

### Minor / cosmetic

30. **`formatPersianDate` in utils.ts** typed as `Date` but sometimes called with ISO strings (works at runtime via JS coercion)
31. **Bundle size ~1 MB** — no code splitting; Vite warns about chunk size

---

## Unresolved Questions / Open Decisions

These were discussed in analysis or implementation but **not finalized or not yet built**:

1. **Unified capacity constant** — Should `total_spots` be 40, 50, or read from a Settings model/DB? Dashboard, reports, and seeded spots disagree.

2. **Full role-based permissions** — Only user management is manager-only. Should tariffs, shifts, user-visible nav items be restricted by role?

3. **Operator tracking** — Should VehicleTraffic and OperatorShift link to the authenticated JWT user?

4. **Custom reports date range UI** — Date pickers not built; backend supports `range=custom` with `start_date`/`end_date`.

5. **Password management** — No reset, change password, or invite flow for created users.

6. **Production database** — PostgreSQL migration path not decided.

7. **Environment-based config** — SECRET_KEY, DEBUG, ALLOWED_HOSTS, CORS origins not moved to env vars yet.

8. **Duplicate entry policy** — Block same plate if already inside? Allow re-entry?

9. **Daily tariff cap** — Frontend mock had `dailyFee`; backend formula has no daily cap.

10. **Reserved/disabled spots** — Schema supports `reserved` and `disabled` statuses; no UI/API to manage them; seed creates all `available`.

11. **Export functionality** — PDF/Excel/print for reports — mentioned in UI, not scoped for implementation.

12. **README update** — Should document auth endpoints, new dashboard/reports endpoints.

---

## Environment & Config

### Environment variables

| Variable | Location | Default | Purpose |
|----------|----------|---------|---------|
| `VITE_API_URL` | `parking_frontend/.env` | `http://127.0.0.1:8000` | Frontend API base URL |
| `DJANGO_SETTINGS_MODULE` | Set by manage.py/wsgi | `parking_backend.settings` | Django settings |

**No `.env` for Django** — SECRET_KEY and DEBUG are hardcoded in `settings.py`.

**Secrets NOT in repo (by gitignore):** `parking_frontend/.env`, `db.sqlite3`, `venv/`

### Config files

| File | Purpose |
|------|---------|
| `parking_backend/settings.py` | Django settings, JWT, CORS, REST_FRAMEWORK |
| `parking_frontend/vite.config.ts` | Vite plugins, `@` alias, Figma asset resolver |
| `parking_frontend/postcss.config.mjs` | Empty `{}` — Tailwind via Vite plugin |
| `parking_frontend/package.json` | Frontend deps and scripts |
| `requirements.txt` | Python deps |
| `.gitignore` | Ignore patterns |

### CORS (development)

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### JWT settings

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

### Setup steps (fresh machine)

```bash
# Backend
cd Parking-Management-Project
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver         # http://127.0.0.1:8000

# Frontend
cd parking_frontend
pnpm install                       # or npm install
# Ensure .env exists with VITE_API_URL=http://127.0.0.1:8000
pnpm dev                           # http://localhost:5173
```

### Third-party services

**None.** Fully local — no external APIs, payment gateways, SMS, or email services configured.

---

## Next Steps

Priority order based on known issues, original roadmap, and what's still missing:

### P0 — Data consistency & integrity
1. **Unify `total_spots`** — single source of truth (40 vs 50); align dashboard, reports, seeded spots, and stats API
2. **Prevent duplicate active plate entries** — backend validation on vehicle entry
3. **Compute EndShift stats from real VehicleTraffic** — replace hardcoded revenue/entered/exited

### P1 — Security & production readiness
4. **Move SECRET_KEY, DEBUG, ALLOWED_HOSTS to environment variables**
5. **Password management** — secure random password on user create + forced change, or invite flow
6. **Update README** — document auth, dashboard-charts, reports endpoints; remove stale auth note
7. **Add `tsconfig.json`** and typecheck script to frontend

### P2 — Complete remaining UI wiring (keep UI, wire data)
8. **Settings persistence** — Settings model + API + wire settings page
9. **Reports custom date range** — add date pickers to UI (backend already supports it)
10. **Link operator to authenticated user** on entry and shift start
11. **Dashboard stat cards** — fix "ورود امروز" to count today's entries; wire "اپراتورهای فعال"
12. **Topbar active shift badge** — fetch from `/api/shifts/`

### P3 — Role-based access expansion
13. **Extend RBAC** — restrict tariffs/users nav or endpoints by role beyond current user-management-only rule
14. **Hide `/users` nav for non-managers** (optional UX; API already blocks)

### P4 — Quality & ops
15. **Backend tests** — entry/exit fee calculation, spot assignment, auth, reports date ranges
16. **Frontend tests** — critical flows (login, entry, exit)
17. **Remove dead dependencies** (MUI, etc.)
18. **Register all models in Django admin**
19. **Pagination** on list endpoints
20. **Export reports** (PDF/Excel) if needed

### P5 — Production deployment
21. **PostgreSQL** instead of SQLite
22. **Docker Compose** for local/prod
23. **CI pipeline** (lint, test, build)
24. **Code splitting** to reduce ~1 MB bundle

---

## Quick reference: files modified/created during conversation

### Created
- `requirements.txt`, `.gitignore`, `README.md`
- `parking_api/auth_views.py`, `auth_serializers.py`, `permissions.py`
- `parking_api/dashboard_analytics.py`, `report_analytics.py`, `spot_services.py`
- `parking_api/migrations/0006_vehicletraffic_parking_spot.py`, `0007_seed_parking_spots.py`
- `parking_frontend/.env`
- `parking_frontend/src/app/lib/api.ts`, `auth-storage.ts`
- `parking_frontend/src/app/context/auth-context.tsx`
- `parking_frontend/src/app/components/protected-route.tsx`

### Significantly modified
- `parking_backend/settings.py` — JWT, REST_FRAMEWORK, CORS
- `parking_api/models.py` — parking_spot FK
- `parking_api/views.py` — auth, analytics, reports, spot assignment, real parking spots list
- `parking_api/serializers.py` — parking_spot fields
- `parking_api/urls.py` — all new routes
- All frontend page files connected to API (except settings)
- `parking_frontend/src/app/App.tsx`, `login-page.tsx`, `app-sidebar.tsx`

---

*End of PROJECT_CONTEXT.md*
