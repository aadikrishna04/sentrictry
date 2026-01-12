# Quick Deployment Checklist - All on Vercel

## 🚀 Deploy Everything to Vercel

### 1. Backend API (Do This First!)

**In Vercel Dashboard:**

1. New Project → Import GitHub repo
2. **Root Directory**: `dashboard/backend`
3. Framework: Other (or leave blank)
4. **Environment Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS=https://app.sentriclabs.com,http://localhost:3000`
5. Deploy
6. Copy the Vercel URL (e.g., `https://sentric-api.vercel.app`)
7. Optional: Add domain `api.sentriclabs.com`

### 2. Landing Page (www.sentriclabs.com)

**In Vercel Dashboard:**

1. New Project → Import GitHub repo
2. **Root Directory**: `landing-page`
3. Framework: Next.js (auto-detected)
4. Deploy
5. Settings → Domains → Add `www.sentriclabs.com`
6. Copy the CNAME value

**In GoDaddy DNS:**

- Add CNAME: `www` → `[Vercel CNAME value]`

### 3. Dashboard (app.sentriclabs.com)

**In Vercel Dashboard:**

1. New Project → Import same GitHub repo
2. **Root Directory**: `dashboard/frontend`
3. Framework: Next.js (auto-detected)
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-url.com`
5. Deploy
6. Settings → Domains → Add `app.sentriclabs.com`
7. Copy the CNAME value

**In GoDaddy DNS:**

- Add CNAME: `app` → `[Vercel CNAME value]`

## 📝 Environment Variables Reference

### Dashboard Frontend (Vercel)

```
NEXT_PUBLIC_API_URL=https://sentric-api.vercel.app/api
```

(Or `https://api.sentriclabs.com/api` if using custom domain)

### Backend API (Vercel)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

## ✅ Post-Deployment

- [ ] Test `www.sentriclabs.com` loads
- [ ] Test `app.sentriclabs.com` loads
- [ ] Test login/signup works
- [ ] Test API calls work (check browser console)
- [ ] Verify CORS is working (backend allows app.sentriclabs.com)

## 🔧 Troubleshooting

**CORS Errors?**

- Backend CORS is configured for `app.sentriclabs.com`
- If using different domain, update `dashboard/backend/main.py` line 142

**API Not Found?**

- Check `NEXT_PUBLIC_API_URL` is set correctly
- Ensure backend is deployed and accessible
- Check backend logs for errors

**DNS Not Working?**

- Wait 24-48 hours for propagation
- Verify CNAME records in GoDaddy
- Check Vercel domain settings show "Valid Configuration"
