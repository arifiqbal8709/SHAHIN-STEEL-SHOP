# SHAHIN STEEL FURNITURE — Complete Shop Management System
### Architecture, MySQL Cloud Setup & Multi-Device Deployment Guide

---

## 1. System Overview & Technology Stack

- **Frontend**: React.js, Tailwind CSS, Lucide Icons, Recharts, jsPDF
  - Theme: Dark charcoal sidebar (`#211F1C`), cream/off-white background (`#F7F5F0`), champagne gold & beige accents (`#C49A6C`).
  - Responsive: Desktop, Laptop, Tablet, Mobile (with slide-out drawer).
- **Backend**: Python 3.12+, Django REST Framework, Django ORM, Token & Session Auth.
- **Database**: Central Cloud MySQL 8.0+ relational database with atomic transactions (`transaction.atomic`) for all sales, stock deductions, purchases, and EMI installments.
- **Multi-Device Sync**: Instagram-style shared access. Multiple authorized devices (laptop cashier counter, owner mobile, accountant desk) connect to the **same central cloud database**.

---

## 2. Directory Structure

```text
SHAHIN-STEEL-FURNITURE/
│
├── frontend/                     # React.js SPA
│   ├── public/                   # Showroom banners, logos & assets
│   ├── src/
│   │   ├── components/           # 12-item Sidebar, Header, Modals, Print Slips
│   │   ├── context/              # AuthContext (RBAC) & SyncContext (Real-time)
│   │   ├── pages/                # 12 Modules (Dashboard, Sales, Stock, EMI, etc.)
│   │   └── services/             # Axios REST client with auto-sync
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Python Django REST API
│   ├── config/                   # Django settings, URLs, WSGI
│   ├── shop_api/                 # Models, Serializers, Views, URLs
│   │   ├── management/commands/  # seed_demo_data command
│   │   └── migrations/           # Database migration files
│   ├── manage.py
│   ├── requirements.txt
│   └── .env                      # Database credentials & secret keys
│
├── database/                     # MySQL Relational Schema
│   └── schema.sql                # Complete 20-table DDL script & seed queries
│
└── deployment/                   # Cloud Deployment Orchestration
    ├── docker-compose.yml        # One-click Docker containerization
    ├── vercel.json               # Vercel SPA redirect rules
    └── README.md                 # Deployment & Cloud guide
```

---

## 3. How Multi-Device Cloud Synchronization Works

Just like Instagram, when a store account signs in from different devices:
1. **Laptop (Showroom Cash Counter)**: Staff creates a sale of 2 Royal Steel Almirahs.
2. The transaction hits the Django API endpoint `/api/sales/` with atomic integrity:
   - The invoice record is created.
   - 2 units are deducted from the central MySQL `products` table.
   - Audit log & stock movement trail are updated.
3. **Owner's Mobile Phone**: The React application runs background synchronization (`/api/sync-status/`).
4. The moment the sale is finalized in the database, the mobile phone detects the state change, updates the dashboard revenue figures, and reduces the visible stock count immediately without manual page reload!

---

## 4. Running Locally

### Step 1: Start Python Django Backend
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000
```
API server will be online at `http://127.0.0.1:8000/api/`.

### Step 2: Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in any browser.

---

## 5. Setting Up Cloud MySQL Database (AWS RDS / Railway / Aiven / PlanetScale)

1. Provision a MySQL 8.0 instance on your preferred cloud provider (e.g. AWS RDS, Railway.app, or Aiven).
2. Open `backend/.env` and update:
   ```env
   USE_MYSQL=True
   DB_ENGINE=mysql
   DB_NAME=shahin_furniture_db
   DB_USER=your_cloud_mysql_user
   DB_PASSWORD=your_cloud_mysql_password
   DB_HOST=your_cloud_mysql_host.com
   DB_PORT=3306
   ```
3. Import `database/schema.sql` into your cloud MySQL database or execute:
   ```bash
   python manage.py migrate
   python manage.py seed_demo_data
   ```

---

## 6. Cloud Hosting Deployment

### Frontend (Vercel)
1. Push the code to GitHub.
2. Connect the repository to **Vercel**.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `VITE_API_URL`: Your hosted backend URL (e.g. `https://your-shahin-backend.onrender.com/api`)
5. Click **Deploy**.

### Backend (Render / Railway)
1. Deploy the `backend/` folder on **Render** or **Railway**.
2. Build Command: `pip install -r requirements.txt && python manage.py migrate`
3. Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
4. Set Environment Variables matching your cloud MySQL database.

