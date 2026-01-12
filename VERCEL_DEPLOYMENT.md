# Complete Vercel Deployment Guide

This guide covers deploying all three parts of Sentric on Vercel:
1. Landing Page → `www.sentriclabs.com`
2. Dashboard → `app.sentriclabs.com`
3. Backend API → `api.sentriclabs.com` (or subdomain of your choice)

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- GitHub repository connected to Vercel
- GoDaddy domain: `sentriclabs.com`
- Supabase project (for backend database)

## Step 1: Deploy Backend API (Do This First!)

**Why first?** You need the backend URL to configure the dashboard.

1. **Go to Vercel Dashboard** → Add New Project
2. **Import your GitHub repository**
3. **Configure Project**:
   - **Project Name**: `sentric-api` (or your choice)
   - **Root Directory**: `dashboard/backend`
   - **Framework Preset**: Other (or leave blank)
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty

4. **Add Environment Variables**:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ALLOWED_ORIGINS=https://app.sentriclabs.com,http://localhost:3000
   ```

5. **Deploy** → Wait for deployment to complete

6. **Copy the Deployment URL** (e.g., `https://sentric-api.vercel.app`)

7. **Add Custom Domain** (Optional but recommended):
   - Go to Project Settings → Domains
   - Add `api.sentriclabs.com`
   - Copy the CNAME value for DNS configuration

## Step 2: Deploy Landing Page

1. **Go to Vercel Dashboard** → Add New Project
2. **Import the same GitHub repository**
3. **Configure Project**:
   - **Project Name**: `sentric-landing` (or your choice)
   - **Root Directory**: `landing-page`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

4. **Deploy** → No environment variables needed

5. **Add Custom Domain**:
   - Go to Project Settings → Domains
   - Add `www.sentriclabs.com`
   - Copy the CNAME value for DNS configuration

## Step 3: Deploy Dashboard

1. **Go to Vercel Dashboard** → Add New Project
2. **Import the same GitHub repository**
3. **Configure Project**:
   - **Project Name**: `sentric-dashboard` (or your choice)
   - **Root Directory**: `dashboard/frontend`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

4. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://sentric-api.vercel.app/api
   ```
   (Or use your custom domain: `https://api.sentriclabs.com/api`)

5. **Deploy**

6. **Add Custom Domain**:
   - Go to Project Settings → Domains
   - Add `app.sentriclabs.com`
   - Copy the CNAME value for DNS configuration

## Step 4: Configure GoDaddy DNS

1. **Log into GoDaddy** → DNS Management for `sentriclabs.com`

2. **Add DNS Records**:

   For `www.sentriclabs.com` (Landing Page):
   ```
   Type: CNAME
   Name: www
   Value: [CNAME from Vercel landing page project]
   TTL: 600
   ```

   For `app.sentriclabs.com` (Dashboard):
   ```
   Type: CNAME
   Name: app
   Value: [CNAME from Vercel dashboard project]
   TTL: 600
   ```

   For `api.sentriclabs.com` (Backend API):
   ```
   Type: CNAME
   Name: api
   Value: [CNAME from Vercel backend project]
   TTL: 600
   ```

   For root domain `sentriclabs.com` (redirect to www):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
   (Or use Vercel's A record if provided)

3. **Wait for DNS Propagation** (usually 5-30 minutes, can take up to 48 hours)

4. **Verify in Vercel**:
   - Go to each project's Domains settings
   - Wait for SSL certificate to be issued (automatic, usually within minutes)

## Step 5: Update Dashboard API URL (If Using Custom Domain)

If you added a custom domain for the backend (`api.sentriclabs.com`):

1. Go to Dashboard project in Vercel
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` to: `https://api.sentriclabs.com/api`
4. Redeploy (or wait for automatic redeploy)

## Environment Variables Summary

### Backend API (Vercel)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ALLOWED_ORIGINS=https://app.sentriclabs.com,http://localhost:3000
```

### Dashboard Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://sentric-api.vercel.app/api
```
(Or `https://api.sentriclabs.com/api` if using custom domain)

### Landing Page (Vercel)
```
(No environment variables needed)
```

## Post-Deployment Checklist

- [ ] Backend API accessible at `https://sentric-api.vercel.app` (or custom domain)
- [ ] Landing page accessible at `www.sentriclabs.com`
- [ ] Dashboard accessible at `app.sentriclabs.com`
- [ ] Dashboard can authenticate users (test login/signup)
- [ ] Dashboard can fetch projects/runs/data
- [ ] SSL certificates active (automatic on Vercel)
- [ ] CORS working correctly (backend allows app.sentriclabs.com)

## Testing Your Deployment

1. **Test Backend API**:
   ```bash
   curl https://sentric-api.vercel.app/api/health
   ```
   Should return: `{"status":"healthy","version":"0.1.0"}`

2. **Test Landing Page**:
   - Visit `www.sentriclabs.com`
   - Should load without errors

3. **Test Dashboard**:
   - Visit `app.sentriclabs.com`
   - Try signing up/logging in
   - Check browser console for any errors
   - Verify data loads correctly

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` in backend includes `https://app.sentriclabs.com`
- Check browser console for specific CORS error messages
- Verify backend is allowing credentials

### API Not Found (404)
- Check `NEXT_PUBLIC_API_URL` is set correctly in dashboard
- Ensure backend URL includes `/api` prefix if needed
- Verify backend routes are working: `curl https://your-backend.vercel.app/api/health`

### Environment Variables Not Working
- Ensure variables are prefixed with `NEXT_PUBLIC_` for frontend
- Redeploy after adding/changing environment variables
- Check variable names match exactly (case-sensitive)

### DNS Not Resolving
- Wait 24-48 hours for full propagation
- Use `dig www.sentriclabs.com` or `nslookup www.sentriclabs.com` to check
- Verify CNAME records in GoDaddy match Vercel's requirements
- Check Vercel domain settings show "Valid Configuration"

### Build Failures
- Check Vercel build logs for specific errors
- Ensure all dependencies are in `package.json` (frontend) or `requirements.txt` (backend)
- Verify Node.js/Python versions are compatible

## Project Structure Reference

```
sentrictry/
├── landing-page/          → www.sentriclabs.com
│   ├── vercel.json
│   └── ...
├── dashboard/
│   ├── frontend/          → app.sentriclabs.com
│   │   ├── vercel.json
│   │   └── ...
│   └── backend/           → api.sentriclabs.com
│       ├── api/
│       │   └── index.py   (Vercel serverless entry point)
│       ├── vercel.json
│       └── ...
└── ...
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Python Runtime](https://vercel.com/docs/frameworks/backend/fastapi)
- [GoDaddy DNS Help](https://www.godaddy.com/help)
