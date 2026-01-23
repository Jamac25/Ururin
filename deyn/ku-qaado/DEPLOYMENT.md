# Ku Qaado - Deployment Guide

This guide covers the deployment instructions for the Ku Qaado application.

## Prerequisites

- [Supabase](https://supabase.com) account (for Database)
- [Netlify](https://netlify.com) account (for Frontend)
- [Render](https://render.com) or [Railway](https://railway.app) account (for Backend)

## 1. Database (Supabase)

You have already set up Supabase. Ensure you have the following environment variables ready:

- `SUPABASE_URL`
- `SUPABASE_KEY` (Service Role Key recommended for backend, but Anon key is fine if RLS is set up, currently we use Service Role for backend admin rights)

## 2. Backend Deployment (Render/Railway)

The backend is located in the `server/` directory.

### Steps for Render:

1.  **New Web Service**: Connect your GitHub repository.
2.  **Root Directory**: Set to `server`.
3.  **Build Command**: `npm install`
4.  **Start Command**: `npm start`
5.  **Environment Variables**: Add the following:
    - `SUPABASE_URL`: Your Supabase Project URL
    - `SUPABASE_KEY`: Your Supabase Service Role Key
    - `PORT`: `10000` (or let Render assign it)

### Steps for Railway:

1.  **New Project**: Deploy from GitHub repo.
2.  **Root Directory**: Set to `server`.
3.  **Variables**: Add `SUPABASE_URL` and `SUPABASE_KEY`.
4.  Railway automatically detects `package.json` and runs `npm install` and `npm start`.

**Important**: After deployment, copy the **Backend URL** (e.g., `https://ku-qaado-server.onrender.com`).

## 3. Frontend Deployment (Netlify)

The frontend is located in the `web/` directory.

### Steps:

1.  **New Site from Git**: Connect your GitHub repository.
2.  **Build Settings**:
    - **Base directory**: `web` (or leave empty if using `netlify.toml` in the root, but setting `web` is safer if no build step)
    - **Publish directory**: `web` (or `.` if Base directory is set to `web`)
    - **Build command**: (Leave empty, this is a vanilla JS app)
3.  **Environment Variables** (Optional but recommended if we use a build step later, currently `config.js` is runtime):
    - Since `config.js` determines the API URL based on hostname, you might need to hardcode it or use a script to inject it if the auto-detection doesn't work for your specific setup.
    - **Current `config.js` logic**: It checks if `window.location.hostname` includes `localhost`. If not, it defaults to a production URL.
    - **ACTION REQUIRED**: Update `web/config.js` with your **actual production Backend URL** before deploying, OR ensure the default fallback in `config.js` is correct.

    *Open `web/config.js` and change the default `API_URL`:*

    ```javascript
    const CONFIG = {
        API_URL: window.location.hostname.includes('localhost')
            ? 'http://localhost:5173'
            : 'https://YOUR-BACKEND-URL.onrender.com' // <--- UPDATE THIS
    };
    ```

## 4. Mobile App (Expo)

1.  update `API_URL` in `App.js` to point to your production backend.
2.  Run `npx expo publish` to update the OTA update or build the standalone binary.

## 5. Verification

1.  Open the Netlify URL.
2.  Login as a Merchant.
3.  Verify Dashboard loads data from Supabase.
4.  Create a Debt -> Check if WhatsApp link is generated.
5.  Click the WhatsApp link -> Verify Customer Portal loads.
