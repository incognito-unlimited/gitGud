# gitGUD

This is a full-stack monorepo built with [Turborepo](https://turbo.build/repo), consisting of a React frontend and multiple backend services.

## Project Architecture

- **`apps/frontend`**: React/Vite frontend application.
- **`apps/auth-lobby-service`**: Node.js/Express service handling authentication, JWT, Google/GitHub OAuth, and lobbies.
- **`apps/game-engine-service`**: Node.js/Express service handling core game logic and real-time Socket.io events.
- **`apps/ai-agent-service`**: Python/FastAPI microservice orchestrating LangGraph AI logic (Recap Agent, Fault Generation, Difficulty Adaptation).
- **`packages/database`**: Shared PostgreSQL schema and configurations using Drizzle ORM.
- **`packages/shared`**: Shared TypeScript types and contracts.

---

## Authentication & Setup Options

### Running locally (no GitHub setup required)

By default, local development uses **Dev Login** via `/auth/dev-login`. No OAuth registration or GitHub API keys are needed to run and test the application on your computer.

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gitGUD
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Start the application stack:
   - **With Docker**: `docker-compose up --build`
   - **Without Docker**: Run `npm install`, start local PostgreSQL, and execute `npm run dev`
4. Open [http://localhost:5173](http://localhost:5173) (or `http://localhost:80` for Docker).
5. On the sign-in screen, enter any test username (e.g. `alice`, `bob`, `charlie`) and click **Sign In (Dev Login)**.

> [!NOTE]
> In production (`NODE_ENV=production`), the `/auth/dev-login` endpoint is disabled and returns a `403 Forbidden` error.

---

### Testing real GitHub OAuth locally (optional)

If you want to test the full GitHub OAuth flow on your local machine:

1. Register a personal GitHub OAuth App on GitHub:
   - Go to **GitHub Settings** -> **Developer Settings** -> **OAuth Apps** -> **New OAuth App**.
   - **Application Name**: `gitGUD Local Dev`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization Callback URL**: `http://localhost:4101/auth/github/callback`
2. Update your `.env` file (or `apps/auth-lobby-service/.env` and `apps/frontend/.env.local`):
   ```env
   GITHUB_CLIENT_ID=your_registered_client_id
   GITHUB_CLIENT_SECRET=your_registered_client_secret
   GITHUB_CALLBACK_URL=http://localhost:4101/auth/github/callback
   VITE_ENABLE_GITHUB_OAUTH=true
   ```
3. Restart the services (`docker-compose up --build` or `npm run dev`).
4. Navigating to the sign-in page will now display the **Continue with GitHub** button, which initiates the real OAuth redirect flow.

---

## Prerequisites

To run this project with Docker:
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Must be open and running)
- **Git**

---

## How to Run Locally (Docker)

```bash
cp .env.example .env
docker-compose up --build
```

**Services:**
- **Frontend App**: [http://localhost](http://localhost) (or `http://localhost:80`)
- **API Documentation (Swagger)**: [http://localhost:4101/docs](http://localhost:4101/docs)

To stop the cluster: `CTRL + C` or `docker-compose down`.

---

## Running Locally Without Docker (Advanced)

1. Install Node.js (v22) and Python (v3.11).
2. Install npm dependencies: `npm install`
3. Install Python dependencies: `cd apps/ai-agent-service && pip install -r requirements.txt`
4. Make sure PostgreSQL is running locally and set `DATABASE_URL` in `.env`.
5. Run the dev servers: `npm run dev`
