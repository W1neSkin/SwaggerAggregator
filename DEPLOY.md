# Deployment Guide

Step-by-step instructions to deploy Swagger Aggregator to free cloud platforms.

---

## Architecture

| Component | Platform | Free tier |
|-----------|----------|-----------|
| Database  | Neon.tech | 0.5 GB storage, auto-suspend |
| Backend   | Render.com | 750 hours/month, auto-sleep after 15 min |
| Frontend  | Vercel | 100 GB bandwidth/month |
| Mobile    | EAS Build (Expo) | 30 builds/month |

---

## 1. Database: Neon PostgreSQL

1. Go to [https://neon.tech](https://neon.tech) and sign up (GitHub SSO works).
2. Click **"New Project"**.
   - Name: `swagger-aggregator`
   - Region: US East (or closest to you)
3. After creation, copy the **connection string** from the dashboard.
   - It looks like: `postgresql://user:pass@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. **Important**: Replace `postgresql://` with `postgresql+asyncpg://` for our backend.
   - Final format: `postgresql+asyncpg://user:pass@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require`

Save this URL — you'll need it for the backend deployment.

---

## 2. Backend: Render.com

### Option A: Blueprint (recommended)

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign up with GitHub.
2. Go to **Blueprints** > **New Blueprint Instance**.
3. Connect the `W1neSkin/SwaggerAggregator` repository.
4. Render reads `render.yaml` and creates the service.
5. Set the environment variables in the Render dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string (with `postgresql+asyncpg://`) |
| `SECRET_KEY` | Run `openssl rand -hex 32` and paste the result |
| `MASTER_ENCRYPTION_KEY` | Run `openssl rand -hex 32` and paste the result |
| `CORS_ORIGINS` | Your Vercel URL (e.g. `https://swagger-aggregator.vercel.app`) |

### Option B: Manual setup

1. Sign up at [https://render.com](https://render.com) with GitHub.
2. Click **"New" > "Web Service"**.
3. Connect the `W1neSkin/SwaggerAggregator` repository.
4. Configure:
   - **Name**: `swagger-aggregator-api`
   - **Region**: Oregon
   - **Runtime**: Docker
   - **Dockerfile path**: `./backend/Dockerfile`
   - **Docker context**: `./backend`
   - **Plan**: Free
5. Add environment variables (same as Option A table above).
6. Click **"Create Web Service"**.

After deployment, note the URL (e.g. `https://swagger-aggregator-api.onrender.com`).

### Verify

```bash
curl https://swagger-aggregator-api.onrender.com/api/health
# Expected: {"status":"ok","service":"swagger-aggregator"}
```

> **Note**: Free tier services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

## 3. Frontend: Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up with GitHub.
2. Click **"Add New..." > "Project"**.
3. Import the `W1neSkin/SwaggerAggregator` repository.
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `cd .. && npm install && npm run build --workspace=frontend`
   - **Output Directory**: `dist`
   - **Install Command**: `cd .. && npm install`
5. Add environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Render backend URL (e.g. `https://swagger-aggregator-api.onrender.com`) |

6. Click **"Deploy"**.

After deployment, note the URL (e.g. `https://swagger-aggregator.vercel.app`).

### Update CORS on Render

Go back to Render dashboard and update `CORS_ORIGINS` to include your Vercel URL.

---

## 4. Mobile: Expo (EAS Build)

### Prerequisites

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

### Build for testing (internal distribution)

```bash
cd mobile

# Android APK (for testing on device)
eas build --platform android --profile preview

# iOS simulator build
eas build --platform ios --profile preview
```

### Update API URL

Edit `mobile/eas.json` and replace the `EXPO_PUBLIC_API_URL` values in the `preview` and `production` profiles with your actual Render backend URL.

### Production builds

For App Store / Google Play submission, update the `submit` section in `eas.json` with your Apple/Google credentials.

```bash
# Production builds
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 5. CI/CD: GitHub Actions

CI runs automatically on push to `master` and on pull requests. It checks:

- **Backend**: Python imports verify
- **Frontend**: TypeScript compilation + Vite build
- **Mobile**: TypeScript type check

Render and Vercel auto-deploy from GitHub on push to `master` — no extra CI steps needed.

---

## Generate Secret Keys

Use these commands to generate secure random keys:

```bash
# For SECRET_KEY (JWT signing)
openssl rand -hex 32

# For MASTER_ENCRYPTION_KEY (Fernet encryption)
openssl rand -hex 32
```

Or with Python:

```python
import secrets
print(secrets.token_hex(32))
```

---

## Local Development (Docker)

For local development, everything runs via Docker Compose:

```bash
docker compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8000
- Database: localhost:5432

---

## Troubleshooting

### Backend won't start on Render
- Check that `DATABASE_URL` uses `postgresql+asyncpg://` prefix (not `postgresql://`).
- Verify Neon project is not suspended.

### Frontend can't reach backend
- Check `VITE_API_URL` is set correctly in Vercel env vars.
- Check `CORS_ORIGINS` on Render includes your Vercel URL.
- Remember: Render free tier sleeps after 15 min — first request may take 30s.

### Mobile can't connect
- For local dev with Android emulator: use `http://10.0.2.2:8000`.
- For local dev with iOS simulator: use `http://localhost:8000`.
- For physical device on same network: use your computer's LAN IP.
