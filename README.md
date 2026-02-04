# Lumina Dining - Table Reservation System

A premium table reservation and management system for high-end restaurants.

## Features
- ✨ Elegant Dark & Gold Luxury Theme
- 📅 Dynamic Reservation Calendar with Drag & Drop
- 🍽️ Smart Table Assignment & Joining Algorithm
- 📸 Cloud-based Menu Management (Supabase Storage)
- 🔒 Staff & Admin Role Access
- ☁️ Fully Serverless Deployment (Vercel + Supabase)

## Tech Stack
- **Frontend**: React, Vite, Framer Motion, Tailwind CSS, Lucide React
- **Backend**: Express (Serverless Functions)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## Getting Started
1. Clone the repository
2. Install dependencies:
   - `cd client && npm install`
   - `cd server && npm install`
3. Setup environment variables (see `.env.example`)
4. Run locally:
   - Client: `npm run dev`
   - Server: `npm start` (or `npm run dev` for nodemon)

## Production Configuration
Ensure the following variables are set in your production environment (Vercel):
- `DATABASE_URL`: Supabase Connection String
- `SUPABASE_URL`: Your Supabase Project URL
- `SUPABASE_ANON_KEY`: Your Supabase API Key
