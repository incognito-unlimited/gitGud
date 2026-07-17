# gitGUD

This is a full-stack monorepo built with [Turborepo](https://turbo.build/repo), consisting of a React frontend and multiple backend services.

## Project Architecture

- **`apps/frontend`**: React/Vite frontend application.
- **`apps/auth-lobby-service`**: Node.js/Express service handling authentication, JWT, Google OAuth, and lobbies.
- **`apps/game-engine-service`**: Node.js/Express service handling the core game logic and real-time events.
- **`apps/ai-agent-service`**: Python/FastAPI service orchestrating LangGraph AI logic (Recap Agent).
- **`packages/database`**: Shared PostgreSQL schema and configurations using Drizzle ORM.
- **`packages/shared`**: Shared TypeScript types and contracts.

---

## Prerequisites

To run this project flawlessly with zero setup errors, you must use **Docker**.

Make sure you have the following installed and running on your local machine:
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Must be open and running!)
- **Git**

---

## How to Run Locally (No Errors)

Follow these exact steps to spin up the entire cluster (Frontend, Backend, AI, Database).

### 1. Clone the repository

```bash
git clone <repository-url>
cd gitGUD
```

### 2. Configure Environment Variables

The system requires several API keys (for Google Auth, Groq/Gemini AI, AWS SES Email, etc.). 

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file in a text editor and fill in the missing values. 
   - *Note: If you leave `LANGCHAIN_API_KEY`, `GOOGLE_API_KEY`, or `GROQ_API_KEY` blank, the Docker engine will throw a warning, but the containers will still run (the AI Recap Agent will just gracefully default to a template response).*

### 3. Start Docker Desktop

> [!WARNING]
> If you get an `error during connect: Head "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/_ping"` error, it means Docker Desktop is **not running**. 
> Please open the Docker Desktop application on your computer and wait for the engine to start (the icon turns green/active).

### 4. Build and Run the Cluster

From the root directory of the project, run the following command to download all images, build the microservices, and start the network:

```bash
docker-compose up --build
```

**What this command does:**
- Provisions a `postgres:15-alpine` database on port `5432`.
- Builds and starts `auth-lobby-service` on port `4101`.
- Builds and starts `game-engine-service` on port `4102`.
- Builds and starts `ai-agent-service` on port `8001`.
- Builds and starts the `frontend` (via NGINX) on port `80`.

### 5. Access the Application

Once the terminal output settles down and shows the services are running, you can access the application:

- **Frontend App**: [http://localhost](http://localhost) (or `http://localhost:80`)
- **API Documentation (Swagger)**: [http://localhost:4101/docs](http://localhost:4101/docs)

To stop the cluster, simply press `CTRL + C` in the terminal, or run:
```bash
docker-compose down
```

---

## Running Locally Without Docker (Advanced)

If you prefer to run the services bare-metal (not recommended due to Python/Node versioning and Postgres DB requirements):

1. Install Node.js (v22) and Python (v3.11).
2. Install npm dependencies: `npm install`
3. Install Python dependencies: `cd apps/ai-agent-service && pip install -r requirements.txt`
4. Make sure you have a local PostgreSQL instance running and set the `DATABASE_URL` in your `.env`.
5. Run the dev servers: `npm run dev`
