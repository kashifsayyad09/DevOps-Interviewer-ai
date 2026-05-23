# DevOps AI Interviewer — Full Stack

> React + Node.js/Express + AWS RDS (PostgreSQL) + Google Gemini AI

---

## Project Structure

```
devops-interviewer/
├── backend/                  # Node.js Express API
│   ├── config/
│   │   └── database.js       # RDS connection pool (pg)
│   ├── routes/
│   │   ├── sessions.js       # POST/GET sessions
│   │   ├── questions.js      # Gemini question generation
│   │   ├── answers.js        # Answer submission & grading
│   │   └── leaderboard.js    # Top scores & stats
│   ├── services/
│   │   └── geminiService.js  # Google Gemini API wrapper
│   ├── scripts/
│   │   └── migrate.js        # RDS table creation
│   ├── server.js             # Express app entry
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                 # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       # Level selection
│   │   │   ├── InterviewPage.jsx  # Live interview
│   │   │   ├── ResultsPage.jsx    # Score + review
│   │   │   └── LeaderboardPage.jsx
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── utils/
│   │   │   └── api.js        # Axios API client
│   │   └── App.jsx
│   ├── Dockerfile
│   └── vite.config.js
│
├── docker-compose.yml        # Local dev with Postgres
└── README.md
```

---

## 1. AWS RDS Setup

### Create RDS Instance (AWS Console)

1. Go to **AWS Console → RDS → Create Database**
2. Choose:
   - Engine: **PostgreSQL 15**
   - Template: **Free tier** (for testing) or **Production**
   - DB instance: `db.t3.micro` (free tier)
   - DB name: `devops_interviewer`
   - Master username: `postgres`
   - Master password: *(choose a strong password)*
3. **Connectivity:**
   - Public access: **Yes** (for local dev) or **No** (use EC2/Lambda)
   - VPC Security Group: Allow inbound on port **5432** from your IP
4. Click **Create Database** — takes ~5 minutes

### Get RDS Endpoint
After creation, go to your RDS instance → **Connectivity & security** tab → copy the **Endpoint** (looks like `devops.xxxxxxxx.ap-south-1.rds.amazonaws.com`)

---

## 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development

# AWS RDS
DB_HOST=your-rds-endpoint.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=devops_interviewer
DB_USER=postgres
DB_PASSWORD=your_rds_password
DB_SSL=true

# Google Gemini (free key from aistudio.google.com)
GEMINI_API_KEY=AIzaSy...your_key_here
GEMINI_MODEL=gemini-1.5-flash

FRONTEND_URL=http://localhost:3000
```
yum install -y nodejs git

# Install client
sudo dnf install postgresql15 -y
# Add connection
PGPASSWORD='N3L~BkxYa)?K<tMgND8zOzfm[IWi' psql -h interview-db.c61wmk0yqjzh.us-east-1.rds.amazonaws.com -U postgres -d postgres -p 5432

CREATE DATABASE devops_interviewer;

```bash
npm install

# Run migrations — creates all tables on RDS
npm run db:migrate

# Start server
npm run dev
```
# production use pm2

npm install -g pm2

pm2 start server.js
pm2 startup
pm2 save

Verify: http://localhost:5000/health

---

## 3. Frontend Setup

```bash
cd frontend
npm install

npm run dev
```
yum install -y git nginx nodejs

App: http://localhost:3000

---

## 4. Docker (Local Dev with Postgres)

```bash
# Copy env
cp backend/.env.example backend/.env
# Edit backend/.env — set GEMINI_API_KEY (DB_ vars are auto-set by docker-compose)

# Start everything
docker-compose up --build

# Run migrations inside container
docker-compose exec backend npm run db:migrate
```

---

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Start new interview session |
| GET | `/api/sessions/:token` | Get session details |
| PATCH | `/api/sessions/:token/complete` | Mark session completed |
| GET | `/api/sessions/:token/history` | Full session + Q&A history |
| POST | `/api/questions/generate` | Generate question via Gemini |
| POST | `/api/answers` | Submit answer (server-side grading) |
| GET | `/api/leaderboard` | Top scores (`?level=fresher\|mid\|senior`) |
| GET | `/api/leaderboard/stats` | Aggregate statistics |
| GET | `/health` | Health check + DB status |

---

## 6. RDS Schema

```sql
sessions        -- Interview sessions with scores
questions       -- AI-generated questions per session
answers         -- User answers with correctness
leaderboard     -- VIEW: top scores ranked by level
```

---

## 7. Production Deployment — Dual Load Balancer Architecture

This setup uses **two separate AWS Application Load Balancers**:

| Load Balancer | Type | Accessible From | Purpose |
|---|---|---|---|
| `devops-frontend-alb` | **Internet-facing** (External) | Public internet (0.0.0.0/0) | Serves the React frontend to users |
| `devops-backend-alb` | **Internal** | Only inside the VPC (private) | Receives API calls from frontend EC2 only |

> **Why two?** The backend API never needs to be reachable from the public internet. Using an Internal ALB means only resources inside your VPC (your frontend servers) can call the backend. This is the correct production security pattern.

---

### Architecture Overview

```
                        INTERNET
                            │
                            ▼
              ┌─────────────────────────────┐
              │   EXTERNAL ALB (Public)      │
              │  devops-frontend-alb         │
              │  Scheme: internet-facing     │
              │  Subnets: PUBLIC subnets     │
              │  Port 80 / 443              │
              └──────────────┬──────────────┘
                             │  HTTP/HTTPS
                             ▼
                 ┌───────────────────────┐
                 │  Frontend EC2 (nginx) │   ← Private subnet
                 │  Serves React app     │
                 │  Port 80              │
                 └──────────┬────────────┘
                            │  /api/* proxy (HTTP port 80, VPC-internal only)
                            ▼
              ┌─────────────────────────────┐
              │   INTERNAL ALB (Private)     │
              │  devops-backend-alb          │
              │  Scheme: internal            │
              │  Subnets: PRIVATE subnets    │
              │  Port 80                    │
              └──────────────┬──────────────┘
                             │  forwards to port 5000
                             ▼
                 ┌───────────────────────┐
                 │  Backend EC2 (Node)   │   ← Private subnet
                 │  Express API          │
                 │  Port 5000            │
                 └──────────┬────────────┘
                            │  PostgreSQL port 5432
                            ▼
                 ┌───────────────────────┐
                 │      AWS RDS          │   ← Private subnet
                 │   PostgreSQL 15       │
                 │   No public access    │
                 └───────────────────────┘

 VPC: 10.0.0.0/16
 ├── Public Subnets:  10.0.1.0/24 (AZ-a), 10.0.2.0/24 (AZ-b)  ← External ALB only
 └── Private Subnets: 10.0.3.0/24 (AZ-a), 10.0.4.0/24 (AZ-b)  ← Internal ALB, EC2s, RDS
```

---

### Security Groups — Who Can Talk to Whom

```
┌─────────────────────────────────────────────────────────────┐
│ sg-frontend-alb  (External ALB)                             │
│   Inbound:  TCP 80, 443  from 0.0.0.0/0  (public internet) │
│   Outbound: TCP 80       to sg-frontend-ec2                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ sg-frontend-ec2  (Frontend EC2 / nginx)                     │
│   Inbound:  TCP 80   from sg-frontend-alb  only             │
│   Outbound: TCP 80   to sg-backend-alb  (API proxy calls)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ sg-backend-alb  (Internal ALB)                              │
│   Inbound:  TCP 80   from sg-frontend-ec2  only             │
│   Outbound: TCP 5000 to sg-backend-ec2                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ sg-backend-ec2  (Backend EC2 / Node.js)                     │
│   Inbound:  TCP 5000 from sg-backend-alb  only              │
│   Outbound: TCP 5432 to sg-rds  (database)                  │
│             TCP 443  to 0.0.0.0/0  (Gemini API calls)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ sg-rds  (RDS PostgreSQL)                                    │
│   Inbound:  TCP 5432 from sg-backend-ec2  only              │
│   Outbound: none                                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 1 — Create the INTERNAL ALB (Backend)

1. **AWS Console → EC2 → Load Balancers → Create Load Balancer**
2. Choose **Application Load Balancer**
3. Settings:
   - Name: `devops-backend-alb`
   - Scheme: **Internal** ← critical, NOT internet-facing
   - IP type: **IPv4**
   - VPC: your VPC
   - Subnets: select **PRIVATE subnets** (at least 2 AZs)
4. Security Group: `sg-backend-alb`
   - Inbound: TCP **80** from `sg-frontend-ec2`
   - Outbound: TCP **5000** to `sg-backend-ec2`
5. Create Target Group:
   - Name: `devops-backend-tg`
   - Protocol: HTTP, Port: **5000**
   - Health check path: `/health`
   - Register your backend EC2 instances
6. Listener: **HTTP:80** → forward to `devops-backend-tg`
7. Create and note the **Internal DNS name**:
   ```
   devops-backend-alb-123456.ap-south-1.elb.amazonaws.com
   ```
   > This DNS only resolves inside your VPC — it has no public IP.

---

### Step 2 — Create the EXTERNAL ALB (Frontend)

1. **AWS Console → EC2 → Load Balancers → Create Load Balancer**
2. Choose **Application Load Balancer**
3. Settings:
   - Name: `devops-frontend-alb`
   - Scheme: **Internet-facing** ← public
   - IP type: **IPv4**
   - VPC: your VPC
   - Subnets: select **PUBLIC subnets** (at least 2 AZs)
4. Security Group: `sg-frontend-alb`
   - Inbound: TCP **80** and **443** from `0.0.0.0/0`
   - Outbound: TCP **80** to `sg-frontend-ec2`
5. Create Target Group:
   - Name: `devops-frontend-tg`
   - Protocol: HTTP, Port: **80**
   - Health check path: `/`
   - Register your frontend EC2 instances
6. Listener: **HTTP:80** → forward to `devops-frontend-tg`
   - For HTTPS: add **HTTPS:443** listener + ACM certificate
7. Create and note the **External DNS name**:
   ```
   devops-frontend-alb-987654.ap-south-1.elb.amazonaws.com
   ```
   > This is the URL users open in their browser.

---

### Step 3 — Deploy Backend EC2

SSH into the backend EC2 (private subnet — use AWS Systems Manager Session Manager):

```bash
aws ssm start-session --target i-your-backend-instance-id
```

```bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

# Get the code
git clone https://github.com/yourrepo/devops-interviewer.git
cd devops-interviewer/backend

# Configure environment
cp .env.example .env
nano .env
```

Fill in `backend/.env` on the backend EC2:

```env
PORT=5000
NODE_ENV=production

# ── AWS RDS (private endpoint, same VPC) ──────────────────
DB_HOST=devops.xxxxxxxx.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=devops_interviewer
DB_USER=postgres
DB_PASSWORD=your_rds_password
DB_SSL=true

# ── Google Gemini ──────────────────────────────────────────
GEMINI_API_KEY=AIzaSy_your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash

# ── CORS: allow the External ALB (frontend-facing URL) ────
# Put the EXTERNAL ALB DNS here (what users see in browser)
FRONTEND_URL=http://devops-frontend-alb-987654.ap-south-1.elb.amazonaws.com
# If using custom domain with HTTPS:
# FRONTEND_URL=https://yourdomain.com
```

```bash
npm install
npm run db:migrate    # creates all tables in RDS

sudo npm install -g pm2
pm2 start server.js --name devops-backend
pm2 startup && pm2 save

# Verify locally (no public access)
curl http://localhost:5000/health
```

---

### Step 4 — Deploy Frontend EC2

The frontend nginx proxies `/api/*` calls to the **Internal ALB DNS** — this is the only place the Internal ALB URL is used.

#### 4a. Build the frontend (on your local machine)

```bash
cd frontend

# Use a relative /api path — nginx on the frontend EC2 handles the proxy
# so the browser just calls /api/... relative to its own origin
echo "VITE_API_URL=/api" > .env.production

npm run build

# Upload the built files to your frontend EC2
scp -r dist/ ec2-user@your-frontend-ec2-ip:/usr/share/nginx/html/
```

> **Why `VITE_API_URL=/api` (relative)?**
> The browser calls `/api/...` which hits the frontend EC2 nginx.
> Nginx then proxies that to the Internal ALB DNS — purely server-side.
> The browser never knows the Internal ALB exists, and it's never exposed to the internet.

#### 4b. Install nginx and configure proxy on frontend EC2

```bash
ssh -i your-key.pem ec2-user@your-frontend-ec2-ip

sudo yum install -y nginx
sudo nano /etc/nginx/conf.d/devops-interviewer.conf
```

Paste this — replace the `proxy_pass` value with your **Internal ALB DNS**:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # ── Serve React SPA (handles client-side routing) ─────────
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Proxy /api/* → Internal ALB (backend, VPC-only) ──────
    # ↓ PUT YOUR INTERNAL ALB DNS HERE ↓
    location /api/ {
        proxy_pass http://devops-backend-alb-123456.ap-south-1.elb.amazonaws.com/api/;
        proxy_http_version 1.1;
        proxy_set_header Host                $host;
        proxy_set_header X-Real-IP           $remote_addr;
        proxy_set_header X-Forwarded-For     $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto   $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout    60s;
    }

    # ── Proxy /health → Internal ALB ──────────────────────────
    location /health {
        proxy_pass http://devops-backend-alb-123456.ap-south-1.elb.amazonaws.com/health;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo nginx -t                   # validate config — must say "ok"
sudo systemctl enable nginx
sudo systemctl restart nginx
```

---

### Step 5 — Where Each URL Goes (Complete Reference)

```
EXTERNAL ALB DNS (internet-facing, user-visible)
  devops-frontend-alb-987654.ap-south-1.elb.amazonaws.com
       │
       ├─→  backend/.env  →  FRONTEND_URL=http://devops-frontend-alb-987654...
       │       (CORS: backend only accepts requests from this origin)
       │
       └─→  frontend/.env.production  →  VITE_API_URL=/api
               (relative — browser calls /api/... on its own origin)

INTERNAL ALB DNS (VPC-only, never exposed to internet)
  devops-backend-alb-123456.ap-south-1.elb.amazonaws.com
       │
       └─→  nginx.conf on frontend EC2  →  proxy_pass http://devops-backend-alb-123456.../api/
               (server-side proxy: nginx → Internal ALB → Backend EC2)
```

Full request flow for one API call:

```
Browser (user's device)
  → POST /api/sessions
  → [External ALB] devops-frontend-alb (internet-facing, port 443)
  → [Frontend EC2] nginx receives request, matches /api/ rule
  → nginx proxy_pass → [Internal ALB] devops-backend-alb (VPC-only, port 80)
  → [Backend EC2] Express server (port 5000)
  → [RDS] PostgreSQL (port 5432, private subnet)
  ← response travels back up the same chain
```

---

### Step 6 — Environment Variable Summary

| Variable | File | Machine | Value to set |
|---|---|---|---|
| `VITE_API_URL` | `frontend/.env.production` | Local build machine | `/api` (relative) |
| `FRONTEND_URL` | `backend/.env` | Backend EC2 | **External ALB** DNS or custom domain |
| `DB_HOST` | `backend/.env` | Backend EC2 | RDS private endpoint |
| `DB_SSL` | `backend/.env` | Backend EC2 | `true` |
| `GEMINI_API_KEY` | `backend/.env` | Backend EC2 | Your Gemini API key |
| `proxy_pass` | `nginx.conf` | Frontend EC2 | **Internal ALB** DNS + `/api/` |

---

### Step 7 — Custom Domain (Optional)

Only the **External ALB** needs a custom domain. The Internal ALB stays internal.

```
yourdomain.com  →  Route 53 ALIAS  →  External ALB  (frontend + proxied API)
```

1. Request SSL cert in **ACM** for `yourdomain.com`
2. Add **HTTPS:443** listener to the External ALB with the ACM cert
3. Add HTTP:80 → redirect to HTTPS:443 on the External ALB
4. Update **backend `.env`** on backend EC2:
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```
5. Rebuild frontend (VITE_API_URL stays `/api` — no change needed):
   ```bash
   npm run build
   ```

---

### Step 8 — Verification Checklist

```bash
# 1. Backend running (run on backend EC2)
curl http://localhost:5000/health
# Expected: {"status":"healthy","database":"connected",...}

# 2. Internal ALB reaches backend (run on frontend EC2)
curl http://devops-backend-alb-123456.ap-south-1.elb.amazonaws.com/health
# Expected: {"status":"healthy",...}

# 3. nginx proxy works (run on frontend EC2)
curl http://localhost/api/leaderboard/stats
# Expected: {"success":true,"stats":{...}}

# 4. External ALB reaches frontend (run from anywhere on internet)
curl http://devops-frontend-alb-987654.ap-south-1.elb.amazonaws.com/
# Expected: HTML page

# 5. Full end-to-end flow (run from anywhere on internet)
curl http://devops-frontend-alb-987654.ap-south-1.elb.amazonaws.com/api/leaderboard/stats
# Expected: {"success":true,"stats":{...}}
```

**Troubleshooting:**

| Test fails | Likely cause | Fix |
|---|---|---|
| Step 1 fails | PM2 not running | `pm2 list` and `pm2 restart devops-backend` |
| Step 2 fails | `sg-backend-alb` inbound wrong | Allow TCP 80 from `sg-frontend-ec2` |
| Step 3 fails | nginx config error | `sudo nginx -t` and check `proxy_pass` URL |
| Step 4 fails | `sg-frontend-alb` or EC2 SG wrong | Allow TCP 80 from External ALB SG |
| Step 5 fails but 3 works | CORS error | Check `FRONTEND_URL` in backend `.env` |
