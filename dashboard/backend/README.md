# Sentric Backend API

FastAPI backend for the Sentric dashboard, deployable on Vercel as serverless functions.

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## Deployment on Vercel

This backend is configured to deploy on Vercel as serverless functions.

### Setup

1. **Create a new Vercel project** from your GitHub repository
2. **Set Root Directory** to `dashboard/backend`
3. **Add Environment Variables**:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `ALLOWED_ORIGINS` (optional) - Comma-separated list of allowed CORS origins

4. **Deploy**

### API Routes

All routes are prefixed with `/api/`:
- `/api/auth/signup` - User registration
- `/api/auth/signin` - User login
- `/api/auth/me` - Get current user
- `/api/projects` - List/create projects
- `/api/projects/{id}/runs` - List runs for a project
- `/api/api-keys` - Manage API keys
- `/api/stats/overview` - Dashboard statistics
- And more...

### Environment Variables

Required:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Optional:
- `ALLOWED_ORIGINS` - Comma-separated CORS origins (defaults to app.sentriclabs.com and localhost)

### Vercel Configuration

The `vercel.json` file configures:
- Python runtime for serverless functions
- Routes all requests to `api/index.py`
- Sets max function duration to 30 seconds

### Notes

- The backend uses Supabase for database and authentication
- WebSocket connections may have limitations on Vercel (consider using Supabase Realtime for live updates)
- Cold starts may occur on first request after inactivity
