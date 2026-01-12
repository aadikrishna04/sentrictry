# Vercel Deployment Checklist

## Before Deploying

- [ ] `api/index.py` exists and imports `app` from `main`
- [ ] `main.py` exists and creates a FastAPI `app` instance
- [ ] `requirements.txt` exists with all dependencies
- [ ] `vercel.json` exists in `dashboard/backend/`
- [ ] `runtime.txt` exists (optional, specifies Python version)

## During Deployment

1. **Go to Vercel Dashboard** → Add New Project
2. **Import GitHub repository**
3. **Set Root Directory**: `dashboard/backend`
4. **Framework**: Leave blank or select "Other"
5. **Add Environment Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALLOWED_ORIGINS` (optional)
6. **Click Deploy**

## After Deployment

### Check Build Status

- [ ] Build shows "Building..." then "Ready" (not "Error")
- [ ] Check build logs for any warnings or errors
- [ ] If build failed, check error messages in logs

### Test Deployment

1. **Get your deployment URL** (e.g., `https://sentric-api.vercel.app`)

2. **Test health endpoint**:
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
   Expected: `{"status":"healthy","version":"0.1.0"}`

3. **Test simple endpoint**:
   ```bash
   curl https://your-project.vercel.app/test
   ```
   Expected: `{"message":"Vercel deployment is working!","status":"ok"}`

### Common Issues

**If build fails:**
- Check build logs for specific error
- Verify `requirements.txt` has all dependencies
- Check Python version compatibility

**If build succeeds but 404:**
- Verify `api/index.py` exists
- Check `vercel.json` routes configuration
- Ensure routes start with `/api/` prefix

**If build succeeds but 500 error:**
- Check Function Logs in Vercel dashboard
- Verify environment variables are set
- Check database connection (Supabase URL/key)

## Next Steps

Once backend is working:
1. Copy the Vercel URL
2. Deploy dashboard frontend
3. Set `NEXT_PUBLIC_API_URL` to backend URL + `/api`
