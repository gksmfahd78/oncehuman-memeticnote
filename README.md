# Once Human Memetic Note

Full-stack web app for tracking and sharing Once Human memetic progress across characters and hives.

Live site: https://memeticnote.kr

## What It Does

- Tracks memetic collection progress by character
- Creates and manages hives for shared progress visibility
- Supports Discord OAuth and JWT-based authentication
- Provides real-time hive chat
- Includes a trading board for item listings and search
- Uses OCR to read memetic information from screenshots
- Supports profile management and trust scoring
- Provides responsive light/dark UI for desktop and mobile

## Tech Stack

Frontend:

- React 19
- React Router v7
- Vite
- Tailwind CSS
- Axios
- Tesseract.js

Backend:

- Node.js
- Express
- SQLite3
- Passport.js with Discord OAuth
- JWT authentication
- Multer
- bcrypt

## Project Structure

```text
oncehuman-memeticnote/
  client/                  React frontend
    src/
      components/
      contexts/
      data/
      pages/
      utils/
    public/
    dist/
  server/                  Node.js backend
    config/
    database/
    middleware/
    routes/
    migrations/
    utils/
    uploads/
  README.md
  LICENSE
```

## Local Development

Requirements:

- Node.js 18 or newer
- npm or yarn

Clone:

```bash
git clone <repository-url>
cd oncehuman-memeticnote
```

Server:

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Client:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

Server `.env`:

```env
PORT=5000
JWT_SECRET=your-secret-key
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:5000/auth/discord/callback
CLIENT_URL=http://localhost:5173
```

Client `.env`:

```env
VITE_API_URL=http://localhost:5000
```

## Build

```bash
cd client
npm run build
```

The production frontend build is generated in `client/dist`.

## API Areas

- Auth: register, login, Discord OAuth
- Users: profile lookup and profile updates
- Hives: hive creation, lookup, invite codes, member sharing
- Memetics: user memetic progress CRUD
- Characters: character CRUD
- Chat: hive chat messages
- Trades: trade listing CRUD

## Status

Production-oriented personal project. The repository is kept public to show the full-stack architecture, OCR workflow, and game-community tooling.

## License

MIT License. See `LICENSE`.
