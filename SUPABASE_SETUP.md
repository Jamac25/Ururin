# Supabase Setup Instructions

Follow these steps to set up Supabase backend for Ururin.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email

## Step 2: Create New Project

1. Click "New Project"
2. Fill in:
   - **Name**: `ururin` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `eu-central-1` for Europe, `ap-southeast-1` for Asia)
3. Click "Create new project"
4. Wait 1-2 minutes for project to initialize

## Step 3: Run Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify all tables were created:
   - Go to **Table Editor** → you should see: `profiles`, `campaigns`, `contributors`, `payments`, `templates`

## Step 4: Get API Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 5: Configure Application

1. Open `supabase-config.js` in your code editor
2. Replace the placeholder values:

```javascript
export const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co'; // Paste your Project URL
export const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Paste your anon public key
```

3. Save the file

## Step 6: Enable Email Auth (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates:
   - Go to **Authentication** → **Email Templates**
   - Customize "Confirm signup", "Magic Link", "Reset Password" templates
   - Change `{{ .SiteURL }}` to your actual domain

## Step 7: Test the Setup

1. Open `index.html` in your browser
2. Try to register a new account
3. Check Supabase dashboard → **Authentication** → **Users** to see if user was created
4. Check **Table Editor** → **profiles** to see if profile was auto-created

## Troubleshooting

### "Failed to fetch" error
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Make sure you're using the **anon public** key, not the service role key

### User created but no profile
- Check SQL Editor for errors when running schema
- Verify the `handle_new_user()` trigger was created
- Manually create profile: `INSERT INTO profiles (id) VALUES ('user-id-here');`

### RLS Policy errors
- Make sure you ran the entire `supabase-schema.sql` file
- Check **Authentication** → **Policies** to see if policies exist
- Try disabling RLS temporarily for testing: `ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;`

## Next Steps

After setup is complete:
1. Test registration and login
2. Create a campaign
3. Verify data appears in Supabase dashboard
4. Test on multiple devices to verify sync

## Security Notes

⚠️ **NEVER commit `supabase-config.js` to Git!** It's already in `.gitignore`.

⚠️ **NEVER use the Service Role key in frontend code!** Only use the anon public key.

✅ Row Level Security (RLS) is enabled on all tables to protect user data.

## Support

If you encounter issues:
1. Check Supabase logs: **Logs** → **Postgres Logs**
2. Check browser console for errors
3. Verify API keys are correct
4. Ensure database schema was created successfully
