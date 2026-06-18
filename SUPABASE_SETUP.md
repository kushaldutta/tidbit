# Supabase Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on your project
3. In the left sidebar, under **Settings**, look for **"API Keys"** or **"API"** (NOT "Data API")
   - If you don't see it, try clicking **Settings** → look for a section/tab called **"API Keys"**
   - Or go directly to: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api`
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`) - you already have this!
   - **service_role key** (under "Project API keys" → "service_role" - this is the SECRET key, keep it safe!)
   - It should be labeled as "service_role" and marked as "secret" - this is different from the "anon" key

## Step 2: Create Environment File

Create a `.env` file in the **project root** (same level as `package.json`):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ IMPORTANT:** The `.env` file is already in `.gitignore` - never commit your keys!

## Step 3: Run Database Schema

1. Go to Supabase dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `server/supabase-schema.sql`
4. Click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

This creates:
- `categories` table
- `tidbits` table
- Indexes for performance
- Auto-update triggers

## Step 4: Seed Database from JSON

Run the seed script to import your existing tidbits:

```bash
cd server
npm install
cd ..
npm run server:seed
```

This will:
- Read `content/tidbits.json`
- Insert all categories
- Insert all tidbits with proper IDs
- Skip duplicates if you run it multiple times

## Step 5: Update Server to Use Supabase

The server code has been updated to use Supabase. Just make sure:
- `.env` file exists with your credentials
- Database schema is created (Step 3)
- Data is seeded (Step 4)

Then restart your server:

```bash
npm run server
```

## Step 6: Test It

1. Start server: `npm run server`
2. Check health: `http://localhost:3001/health`
3. Check tidbits: `http://localhost:3001/api/tidbits`
4. Your app should automatically fetch from Supabase now!

## Email verification (required for sign-up)

The app blocks email/password users until they confirm their address. You must enable this in Supabase:

1. Supabase dashboard → **Authentication** (left sidebar)
2. Under **CONFIGURATION**, click **Sign In / Providers** (there is no separate “Settings” item in the new dashboard)
3. On that page — **not** inside the Email provider popup — scroll to the **User signups** / general auth section at the top
4. Turn **Confirm email** **ON**, then click **Save**
5. Under **CONFIGURATION → URL Configuration**, add these **Redirect URLs**:
   - `tidbit://auth/confirm` (production / TestFlight builds)
   - Your Expo Go dev URL, e.g. `exp://127.0.0.1:8081/--/auth/confirm` (shown in Metro when you run `expo start`)

The **Email** popup (Enable email provider, Secure email change, etc.) no longer contains **Confirm email** — that toggle lives on the main **Sign In / Providers** page.

**Check if it’s already on:** SQL Editor → run:

```sql
select email, email_confirmed_at, created_at
from auth.users
order by created_at desc
limit 10;
```

If `email_confirmed_at` is filled in immediately for new dummy addresses, confirmation is still off (auto-confirm). New sign-ups after you enable **Confirm email** should have `email_confirmed_at` null until they click the link.

Apple Sign-In is unchanged (no email confirmation step).

## Troubleshooting

### "Missing required environment variables"
- Make sure `.env` file exists in project root
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly

### "relation does not exist"
- You haven't run the SQL schema yet (Step 3)
- Go to Supabase SQL Editor and run `server/supabase-schema.sql`

### "permission denied"
- Make sure you're using the **service_role** key (not anon key)
- Service role key has admin access to insert/read data

## Next Steps

Once this works:
1. Deploy server to production (Render, Railway, etc.)
2. Update `src/config/api.js` with production URL
3. Add tidbits via Supabase dashboard or API
4. No more JSON file editing needed! 🎉

