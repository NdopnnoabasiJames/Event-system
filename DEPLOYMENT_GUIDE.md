# Render Deployment Guide (Node.js)

## Prerequisites
1. GitHub account with your code pushed to a repository
2. Render account (free tier available)
3. MongoDB Atlas account for database

## Step 1: Prepare Your Repository
Make sure your code is pushed to GitHub with all the necessary files:
- ✅ render.yaml
- ✅ package.json with engines specification
- ✅ All source code in src/ directory

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)
1. Go to https://render.com and sign in
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the repository containing your NestJS backend
5. Render will automatically detect the `render.yaml` file
6. Click "Apply" to create the service

### Option B: Manual Web Service Creation
1. Go to https://render.com and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: event-system-backend
   - **Environment**: Node
   - **Node Version**: 20.11.0 (or latest LTS)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free

## Step 3: Configure Environment Variables
In your Render dashboard, go to your service → Environment tab and add:

### Required Variables:
- `NODE_ENV` = `production`
- `PORT` = `10000` (Render provides this automatically)
- `DATABASE_URL` = Your MongoDB Atlas connection string
- `JWT_SECRET` = A secure random string (generate one)

### Email Configuration:
- `EMAIL_USER` = Your Gmail address
- `EMAIL_PASSWORD` = Your Gmail app-specific password
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`

### Cloudinary Configuration:
- `CLOUDINARY_CLOUD_NAME` = Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` = Your Cloudinary API key
- `CLOUDINARY_API_SECRET` = Your Cloudinary API secret

### Frontend Configuration:
- `FRONTEND_URL` = Your frontend URL (when you deploy it)

## Step 4: Database Setup (MongoDB Atlas)
1. Go to https://cloud.mongodb.com
2. Create a new cluster (free tier available)
3. Create a database user
4. Whitelist IP addresses (0.0.0.0/0 for all IPs)
5. Get the connection string and use it as `DATABASE_URL`

## Step 5: Deploy
1. After configuring environment variables, click "Manual Deploy" or push new code
2. Render will build and deploy your application
3. You'll get a URL like: `https://your-app-name.onrender.com`

## Step 6: Verify Deployment
Test these endpoints:
- `GET https://your-app-name.onrender.com/api` - Should return API info
- `GET https://your-app-name.onrender.com/api/health` - Health check (if you have one)

## Important Notes:

### Free Tier Limitations:
- Services spin down after 15 minutes of inactivity
- 750 hours of usage per month
- First request after spindown may take 1-2 minutes

### Security:
- Never commit `.env` files to GitHub
- Use Render's environment variables for all secrets
- Enable CORS for your frontend domain

### Troubleshooting:
- Check Render logs in the dashboard
- Ensure all environment variables are set
- Verify MongoDB connection string is correct
- Make sure your MongoDB cluster allows connections from 0.0.0.0/0

## Monitoring:
- Monitor your app via Render dashboard
- Set up log aggregation if needed
- Consider upgrading to paid plan for production use

## Next Steps:
1. Deploy your frontend to Netlify/Vercel
2. Update `FRONTEND_URL` environment variable
3. Test the full application
4. Set up custom domain (optional)
