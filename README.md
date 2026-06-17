# Parking Management System

A full-stack parking management application with a Persian RTL admin dashboard and a Django REST API backend.

| Layer    | Stack                                      |
| -------- | ------------------------------------------ |
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS |
| Backend  | Django 5.2, Django REST Framework, SQLite    |

## Project structure

```
Parking-Management-Project/
├── manage.py                 # Django CLI entry point
├── requirements.txt          # Python dependencies
├── parking_backend/          # Django project settings & URLs
├── parking_api/              # Django app (models, views, serializers)
├── parking_frontend/         # React SPA (Vite)
└── venv/                     # Python virtual environment (local)
```

## Prerequisites

- **Python** 3.10+
- **Node.js** 18+ and **pnpm** (or npm)

## Backend setup

From the project root:

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# (Optional) Create a Django admin superuser
python manage.py createsuperuser

# Start the API server
python manage.py runserver
```

The API runs at **http://127.0.0.1:8000/**  
Admin panel: **http://127.0.0.1:8000/admin/**

### API endpoints

| Method       | Endpoint                  | Description              |
| ------------ | ------------------------- | ------------------------ |
| GET, PUT     | `/api/tariffs/`           | List / update tariffs    |
| POST         | `/api/vehicle-entry/`     | Register vehicle entry   |
| GET          | `/api/active-vehicles/`   | List vehicles inside     |
| POST         | `/api/vehicle-exit/`      | Register exit & fee      |
| GET          | `/api/dashboard-stats/`   | Dashboard statistics     |
| GET          | `/api/parking-spots/`     | Parking spot grid        |
| GET          | `/api/shifts/`            | Shift history            |
| POST         | `/api/shifts/start/`      | Start a shift            |
| POST         | `/api/shifts/end/`        | End active shift         |
| GET, POST    | `/api/users/`             | List / create users      |
| DELETE       | `/api/users/<id>/`        | Delete a user            |

CORS is configured for the Vite dev server at `http://localhost:5173` and `http://127.0.0.1:5173`.

## Frontend setup

```bash
cd parking_frontend

# Install dependencies
pnpm install
# or: npm install

# Start the development server
pnpm dev
# or: npm run dev
```

The app runs at **http://localhost:5173/**

### Production build

```bash
cd parking_frontend
pnpm build
```

Built assets are output to `parking_frontend/dist/`.

## Running both services

1. Start the Django backend: `python manage.py runserver` (from project root)
2. Start the Vite frontend: `pnpm dev` (from `parking_frontend/`)

The frontend calls the API at `http://127.0.0.1:8000/api/`.

## Configuration notes

- **Database:** SQLite (`db.sqlite3` in the project root), created on first `migrate`
- **Timezone:** `Asia/Tehran`
- **Debug mode:** Enabled by default in `parking_backend/settings.py` — disable before production deployment
- **Authentication:** Not yet enforced on API endpoints; login UI is currently simulated on the frontend

## License

Private project — all rights reserved.
