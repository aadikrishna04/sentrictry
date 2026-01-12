# Deployment Guide for Sentric

This guide covers deploying the Sentric project to Vercel with custom domains.

## Project Structure

- **Landing Page**: `landing-page/` → `www.sentriclabs.com`
- **Dashboard**: `dashboard/frontend/` → `app.sentriclabs.com`
- **Backend API**: `dashboard/backend/` → Deploy separately (see Backend Deployment section)

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. GitHub repository connected to Vercel
3. GoDaddy domain: `sentriclabs.com`
4. Supabase project (for backend database)

## Step 1: Deploy Landing Page (www.sentriclabs.com)

1. **Go to Vercel Dashboard** → Add New Project
2. **Import your GitHub repository**
3. **Configure Project**:
   - **Root Directory**: Select `landing-page` folder
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install`

4. **Add Environment Variables** (if needed):
   - None required for landing page

5. **Deploy**

6. **Add Custom Domain**:
   - Go to Project Settings → Domains
   - Add `www.sentriclabs.com`
   - Follow DNS configuration instructions below

## Step 2: Deploy Dashboard (app.sentriclabs.com)

1. **Go to Vercel Dashboard** → Add New Project
2. **Import the same GitHub repository**
3. **Configure Project**:
   - **Root Directory**: Select `dashboard/frontend` folder
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install`

4. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
   ```
   (Replace with your actual backend API URL - see Backend Deployment)

5. **Deploy**

6. **Add Custom Domain**:
   - Go to Project Settings → Domains
   - Add `app.sentriclabs.com`
   - Follow DNS configuration instructions below

## Step 3: Backend API Deployment on Vercel

The FastAPI backend can be deployed directly on Vercel as serverless functions.

1. **Go to Vercel Dashboard** → Add New Project
2. **Import your GitHub repository**
3. **Configure Project**:
   - **Root Directory**: Select `dashboard/backend` folder
   - **Framework Preset**: Other (or leave blank)
   - **Build Command**: Leave empty (Vercel auto-detects Python)
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty

4. **Add Environment Variables**:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

5. **Deploy**

6. **Get the Vercel URL** (e.g., `https://your-backend.vercel.app`)

7. **Update Dashboard Environment Variable**:
   - Go to your dashboard project in Vercel
   - Settings → Environment Variables
   - Update `NEXT_PUBLIC_API_URL` to your backend Vercel URL

**Note**: The backend is configured to work with Vercel serverless functions via `api/index.py` and `vercel.json`. All API routes will be available at `https://your-backend.vercel.app/api/*`.

## Step 4: GoDaddy DNS Configuration

1. **Log into GoDaddy** → DNS Management for `sentriclabs.com`

2. **Add DNS Records**:

   For `www.sentriclabs.com` (Landing Page):
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600
   ```
   (Use the actual CNAME value provided by Vercel)

   For `app.sentriclabs.com` (Dashboard):
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   TTL: 600
   ```
   (Use the actual CNAME value provided by Vercel)

   For root domain `sentriclabs.com` (optional - redirect to www):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
   (Or use Vercel's A record if provided)

3. **Wait for DNS Propagation** (can take up to 48 hours, usually faster)

4. **Verify in Vercel**:
   - Go to each project's Domains settings
   - Wait for SSL certificate to be issued (automatic)

## Step 5: Environment Variables Summary

### Landing Page (Vercel)
- None required

### Dashboard Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend API (Railway/Render)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=8000
```

## Step 6: Post-Deployment Checklist

- [ ] Landing page accessible at `www.sentriclabs.com`
- [ ] Dashboard accessible at `app.sentriclabs.com`
- [ ] Backend API responding to requests
- [ ] Dashboard can authenticate users
- [ ] Dashboard can fetch projects/runs/data
- [ ] SSL certificates active (automatic on Vercel)
- [ ] CORS configured correctly (backend allows frontend domain)

## Troubleshooting

### CORS Issues
If you see CORS errors, update `dashboard/backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.sentriclabs.com",
        "http://localhost:3000",  # For local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Environment Variables Not Working
- Ensure variables are prefixed with `NEXT_PUBLIC_` for frontend
- Redeploy after adding/changing environment variables
- Check variable names match exactly (case-sensitive)

### DNS Not Resolving
- Wait 24-48 hours for full propagation
- Use `dig www.sentriclabs.com` or `nslookup www.sentriclabs.com` to check
- Verify CNAME records in GoDaddy match Vercel's requirements

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [GoDaddy DNS Help](https://www.godaddy.com/help)
