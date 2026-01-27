# Production Deployment Fix Guide

## Problem Summary
Your application is failing in production with:
- `ERR_CONNECTION_REFUSED` on API calls
- Uncaught promise errors in HomeScreen.js

## Root Cause
The frontend is trying to connect to `localhost:5000`, which only works on your local machine. In production, you need to use your actual server URL.

## Solution Steps

### 1. ✅ **API Configuration Created**
I've created `src/utils/api.js` which:
- Uses environment variables for the API URL
- Automatically includes authentication tokens
- Handles errors gracefully
- Redirects to login on unauthorized access

### 2. **Configure Environment Variables**

#### For Development:
Copy `.env.example` to `.env` and update:
```bash
REACT_APP_API_URL=http://localhost:5000
# OR for Vite:
VITE_API_URL=http://localhost:5000
```

#### For Production:
Set environment variables on your hosting platform:
```bash
NODE_ENV=production
REACT_APP_API_URL=https://your-backend-domain.com
MONGO_URI=your_production_mongodb_uri
JWT_SECRET=your_secure_production_secret
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. **Platform-Specific Instructions**

#### **Vercel (Frontend)**
1. Go to Project Settings → Environment Variables
2. Add: `REACT_APP_API_URL` = `https://your-backend-url.com`
3. Redeploy

#### **Render/Railway/Heroku (Backend)**
1. Go to Environment Variables
2. Add all variables from `.env.production.example`
3. Set `FRONTEND_URL` to your deployed frontend URL
4. Redeploy

#### **Netlify (Frontend)**
1. Site Settings → Environment Variables
2. Add: `REACT_APP_API_URL` = `https://your-backend-url.com`
3. Trigger new deploy

### 4. **Verify Your Setup**

#### Check that your frontend build tool recognizes env vars:
- **Create React App**: Variables must start with `REACT_APP_`
- **Vite**: Variables must start with `VITE_`
- **Next.js**: Use `NEXT_PUBLIC_` prefix

#### Test locally:
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend  
REACT_APP_API_URL=http://localhost:5000 npm start
```

### 5. **Common Production Issues**

#### Issue: Still getting localhost errors
**Fix**: Clear your browser cache and rebuild your frontend:
```bash
npm run build
```

#### Issue: CORS errors
**Fix**: Ensure your backend CORS is configured (already set in `src/app.js`)

#### Issue: 502/503 errors
**Fix**: Make sure your backend is actually running and database is connected

### 6. **Deployment Checklist**
- [ ] Backend deployed and running
- [ ] Database connection working
- [ ] Environment variables set on hosting platform
- [ ] `REACT_APP_API_URL` points to backend URL
- [ ] `FRONTEND_URL` set in backend for CORS
- [ ] Frontend rebuilt after changing env vars
- [ ] JWT_SECRET is different in production (not the same as dev)

### 7. **Testing Your Production API**
```bash
# Test if your backend is accessible
curl https://your-backend-url.com/api/products

# Should return JSON, not an error
```

## Files Created
1. ✅ `src/utils/api.js` - Axios instance with auth handling
2. ✅ `.env.example` - Development environment template
3. ✅ `.env.production.example` - Production environment template

## Next Steps
1. Create your actual `.env` file from `.env.example`
2. Update `REACT_APP_API_URL` with your production backend URL
3. Rebuild and redeploy your frontend
4. Test the login and products endpoints

## Need Help?
- Check browser console for specific error messages
- Check backend logs for connection errors
- Verify environment variables are loaded: `console.log(process.env.REACT_APP_API_URL)`
