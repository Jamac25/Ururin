# Deployment Guide

## Option 1: Vercel (Recommended) 🚀

### Prerequisites
- GitHub account
- Vercel account (free)

### Steps
1. **Push to GitHub**
   ```bash
   cd /Users/user/gravity
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ololeeye.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Other
     - Root Directory: ./
     - Build Command: (leave empty)
     - Output Directory: (leave empty)
   - Add Environment Variables:
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - Click "Deploy"

3. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

### Vercel CLI (Alternative)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd /Users/user/gravity
vercel

# Production deployment
vercel --prod
```

---

## Option 2: Netlify 🌐

### Steps
1. **Push to GitHub** (same as above)

2. **Deploy to Netlify**
   - Go to https://netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository
   - Configure:
     - Build command: (leave empty)
     - Publish directory: ./
   - Add Environment Variables:
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - Click "Deploy site"

3. **Custom Domain (Optional)**
   - Go to Site settings → Domain management
   - Add custom domain
   - Follow DNS configuration

### Netlify CLI (Alternative)
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd /Users/user/gravity
netlify deploy

# Production deployment
netlify deploy --prod
```

---

## Option 3: GitHub Pages 📄

### Steps
1. **Push to GitHub** (same as above)

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save

3. **Access your site**
   - URL: `https://YOUR_USERNAME.github.io/ololeeye/`

### Note
- GitHub Pages doesn't support environment variables
- You'll need to hardcode Supabase credentials (not recommended for production)

---

## Environment Variables

### Supabase Configuration
Create a `.env` file (DO NOT commit this):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Update supabase-config.js
Replace hardcoded values with environment variables:
```javascript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'your-fallback-url';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-fallback-key';
```

---

## Post-Deployment Checklist

- [ ] Test all features on production URL
- [ ] Verify Supabase connection works
- [ ] Test PWA installation
- [ ] Check mobile responsiveness
- [ ] Verify all charts load
- [ ] Test WhatsApp integration
- [ ] Check analytics tracking
- [ ] Verify error logging
- [ ] Test on different browsers
- [ ] Check SSL certificate (HTTPS)

---

## Monitoring

### Analytics
- Google Analytics dashboard: https://analytics.google.com
- Track: page views, events, conversions

### Error Tracking
- Check browser console for errors
- Monitor error logs (if implemented)

### Performance
- Use Lighthouse (Chrome DevTools)
- Target scores: >90 for all metrics

---

## Rollback

### Vercel
```bash
vercel rollback
```

### Netlify
- Go to Deploys → Click on previous deploy → "Publish deploy"

### GitHub Pages
- Revert commit in GitHub
- Pages will auto-deploy previous version

---

## Support

Issues? Check:
- Deployment logs
- Browser console
- Network tab (DevTools)
- Supabase dashboard

---

**Last Updated:** 2026-01-20
