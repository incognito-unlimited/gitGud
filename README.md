# gitGUD

This is a full-stack monorepo built with [Turborepo](https://turbo.build/repo), consisting of a frontend application and multiple backend services.

## Project Structure

- `apps/frontend`: The frontend application (React/Vite).
- `apps/auth-lobby-service`: Backend service handling authentication and lobbies.
- `apps/game-engine-service`: Backend service handling the core game logic.
- `packages/`: Shared packages across the applications.

## Prerequisites

Make sure you have the following installed on your local machine:
- **Node.js** (v18 or higher is recommended)
- **npm** (v10+ comes with recent Node.js versions)
- **PostgreSQL** (or a Supabase project) for the database.

## Local Setup Instructions

Follow these steps to get the project running locally on your machine for the first time.

### 1. Clone the repository

```bash
git clone <repository-url>
cd gitGUD
```

### 2. Install Dependencies

From the root of the project, install all dependencies for the apps and packages:

```bash
npm install
```

### 3. Environment Variables

The project relies on environment variables for configuration. You need to set them up before starting the servers.

1. Copy the example `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file and replace the placeholder values (especially `DATABASE_URL` with your local PostgreSQL or Supabase connection string). 
   *Note: You can also place `.env` files directly inside `apps/auth-lobby-service/`, `apps/game-engine-service/`, and `apps/frontend/.env.local` if you prefer to keep service configurations separated.*

### 4. Run the Development Server

Start all services simultaneously in development mode using Turborepo:

```bash
npm run dev
```

This command will start:
- The **Auth & Lobby Service** (typically on http://localhost:4101)
- The **Game Engine Service** (typically on http://localhost:4102)
- The **Frontend App** (typically on http://localhost:5173)

You can now visit http://localhost:5173 in your browser to see the application running.

## Useful Commands

- `npm run dev`: Start all apps in development mode.
- `npm run build`: Build all apps and packages for production.
- `npm run check`: Run typechecking/linting across all apps.
