# Swagger Aggregator

A multi-user web and mobile application that aggregates Swagger/OpenAPI specs from multiple services across multiple environments (local, dev, stage, prod) into a single management interface.

## Features

- Browse services and environments from one place
- View Swagger/OpenAPI endpoint documentation (main + admin)
- Generate JWT tokens with stored secrets
- Securely store jwt_secret and admin_password per environment
- Multi-user with registration and login
- Web app (React) + Mobile app (Expo/React Native)

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy (async), Alembic, PostgreSQL
- **Frontend (Web)**: React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS
- **Frontend (Mobile)**: Expo (React Native), TypeScript
- **Shared**: TypeScript types and API client (npm workspace)
- **Infrastructure**: Docker Compose (local), Render.com + Vercel + Neon (cloud)

## Quick Start (Local Development)

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- Python 3.11+

### 1. Clone and configure

```bash
git clone https://github.com/W1neSkin/SwaggerAggregator.git
cd SwaggerAggregator
cp .env.example .env
# Edit .env with your values
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

This starts:
- **Backend** (FastAPI): http://localhost:8000
- **Frontend** (React): http://localhost:5173
- **PostgreSQL**: localhost:5432

### 3. Run mobile app (optional)

```bash
cd mobile
npm install
npx expo start
```

## Project Structure

```
SwaggerAggregator/
├── backend/          # FastAPI backend
├── shared/           # Shared TypeScript types + API client
├── frontend/         # React web app (Vite + shadcn/ui)
├── mobile/           # Expo React Native mobile app
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT
