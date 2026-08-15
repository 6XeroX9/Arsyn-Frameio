# Review Tool (Frame.io-lite)

Fetches videos from Google Drive, gives clients a link where they can
scrub the video and drop timestamped comments. No annotations, no login.

## What's here

- `db/schema.sql` — run this in Supabase's SQL editor first
- `backend/` — Express API: Drive proxy (with Range support so scrubbing
  is fast), comments, version stacking, approve/status
- `frontend/` — React/Vite client review page

## Setup order

1. **Supabase**: new project → run `db/schema.sql` → copy URL + service role key into `backend/.env`
2. **Google Cloud**: new project → enable Drive API → OAuth client (Desktop app type is easiest for
   the one-time consent flow) → run the consent flow once locally to get a refresh token → put
   client id/secret/refresh token in `backend/.env`
3. **Backend**: `cd backend && npm install && npm run dev` (defaults to `:8787`)
4. **Frontend**: `cd frontend && npm install && npm run dev`, set `VITE_API_URL` if backend isn't on
   localhost
5. To send a client a review link: insert a row in `clients`, then `projects` (grab the
   auto-generated `access_token`), then `videos` pointing at a Drive `file_id`. Send them
   `yourapp.com/review/<access_token>`.

## Not built yet (add later if you want them)

- Frame annotations / drawing overlay
- Email notification on new comment (stubbed in `comments.js`, needs a Resend account + verified
  sending domain)
- A dashboard page for you to manage projects/videos without touching Supabase directly — right
  now that's manual via the Supabase table editor
