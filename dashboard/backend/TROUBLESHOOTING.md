# Troubleshooting Vercel Deployment

## Issue: "Nothing happened" after clicking deploy

### Check Build Logs

1. **Go to Vercel Dashboard** → Your Project → Deployments
2. **Click on the latest deployment**
3. **Check the Build Logs** for errors

Common issues:

### 1. Build Failed - Missing Dependencies

**Error**: `ModuleNotFoundError` or `No module named 'fastapi'`

**Solution**: 
- Ensure `requirements.txt` exists in `dashboard/backend/`
- Check that all dependencies are listed
- Vercel should auto-install from `requirements.txt`

### 2. Build Failed - Import Errors

**Error**: `ImportError: cannot import name 'app' from 'main'`

**Solution**:
- Verify `main.py` exists in `dashboard/backend/`
- Check that `main.py` exports an `app` variable (FastAPI instance)
- Ensure `api/index.py` can import from `main.py`

### 3. Build Succeeded but Routes Don't Work

**Symptoms**: Deployment shows "Ready" but API returns 404

**Check**:
1. Visit: `https://your-project.vercel.app/api/health`
2. Should return: `{"status":"healthy","version":"0.1.0"}`

**If 404**:
- Check `vercel.json` routes configuration
- Ensure `api/index.py` exists and exports `app`
- Verify the route path matches your FastAPI routes

### 4. Environment Variables Not Set

**Symptoms**: Database connection errors, authentication failures

**Solution**:
- Go to Project Settings → Environment Variables
- Add:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ALLOWED_ORIGINS` (optional)
- Redeploy after adding variables

### 5. Function Timeout

**Error**: `Function execution exceeded timeout`

**Solution**:
- Increase `maxDuration` in `vercel.json` (up to 60s on Pro plan)
- Optimize slow database queries
- Check for infinite loops or blocking operations

## Testing Locally with Vercel CLI

To test the Vercel setup locally:

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to backend directory
cd dashboard/backend

# Run Vercel dev server
vercel dev
```

This will start a local server that mimics Vercel's environment.

## Verify Deployment

After deployment, test these endpoints:

1. **Health Check**:
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
   Expected: `{"status":"healthy","version":"0.1.0"}`

2. **API Routes**:
   ```bash
   curl https://your-project.vercel.app/api/projects
   ```
   Expected: 401 (unauthorized) or JSON response if authenticated

## Common Build Errors

### Python Version Mismatch
- Add `runtime.txt` with `python-3.9` (already created)
- Or specify in `vercel.json` if needed

### Missing Files
- Ensure `api/index.py` exists
- Ensure `main.py` exists in parent directory
- Ensure `requirements.txt` exists

### Path Issues
- `api/index.py` should be in `dashboard/backend/api/`
- `main.py` should be in `dashboard/backend/`
- `vercel.json` should be in `dashboard/backend/`

## Still Not Working?

1. **Check Vercel Function Logs**:
   - Go to Project → Functions tab
   - Click on `api/index.py`
   - Check Runtime Logs for errors

2. **Test with Minimal Example**:
   Create a simple test endpoint in `api/test.py`:
   ```python
   from fastapi import FastAPI
   app = FastAPI()
   
   @app.get("/test")
   def test():
       return {"message": "Working!"}
   ```
   Then access `https://your-project.vercel.app/test`

3. **Contact Support**:
   - Vercel has excellent support
   - Share build logs and error messages
   - They can help debug deployment issues
