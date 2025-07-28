# Deployment Guide for Render.com

## Pre-deployment Checklist

✅ **Project cleaned up:**
- Removed unnecessary image files from attached_assets
- Added comprehensive .gitignore
- Created render.yaml configuration

✅ **Code optimized:**
- Mobile responsive admin interface completed
- All features working correctly
- Database schema finalized

## Step-by-Step Deployment on Render

### 1. Prepare Your Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Connect your GitHub repository

### 3. Create PostgreSQL Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configuration:
   - **Name**: `dsa-tracker-db`
   - **Database**: `dsa_tracker`
   - **User**: `dsa_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)

4. Click "Create Database"
5. **Save the connection details** - you'll need the DATABASE_URL

### 4. Deploy Web Service
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configuration:
   - **Name**: `dsa-progress-tracker`
   - **Environment**: `Node`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 5. Environment Variables
Add these environment variables in Render:

```
NODE_ENV=production
DATABASE_URL=<your-postgresql-connection-string>
SESSION_SECRET=<generate-a-random-secret>
```

**Important:** 
- Copy DATABASE_URL from your PostgreSQL service
- Generate SESSION_SECRET: Use a random string (32+ characters)

### 6. Deploy and Initialize Database
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Once deployed, run database migration:
   - Go to your web service dashboard
   - Open "Shell" tab
   - Run: `npm run db:push`

### 7. Seed Initial Data
The application will automatically seed:
- Admin user (admin/admin@123)
- Student data from namelist.txt
- 455+ DSA problems from curriculum file

### 8. Verify Deployment
1. Visit your Render URL
2. Test admin login: username `admin`, password `admin@123`
3. Check student functionality with any seeded student
4. Verify all features work correctly

## Default Credentials
- **Admin**: username `admin`, password `admin@123`
- **Students**: Any registration number from seeded data, password `12345678`

## Production Considerations

### Performance
- Render free tier has limitations (sleeps after 15 min inactivity)
- For production, consider paid plans for better performance
- Database connection pooling is already configured

### Security
- Change default admin password after deployment
- Use strong SESSION_SECRET
- Enable HTTPS (automatic on Render)

### Monitoring
- Check Render logs for any issues
- Monitor database usage
- Set up error tracking if needed

## Troubleshooting

### Common Issues
1. **Build fails**: Check build logs, ensure all dependencies are in package.json
2. **Database connection error**: Verify DATABASE_URL is correct
3. **Session issues**: Ensure SESSION_SECRET is set
4. **Static files not served**: Build process should handle this automatically

### Debug Commands
```bash
# Check environment variables
echo $DATABASE_URL

# Test database connection
npm run db:push

# View application logs
# (Available in Render dashboard)
```

## Post-Deployment Tasks
1. Test all functionality thoroughly
2. Change admin password
3. Update student passwords if needed
4. Configure any additional settings
5. Set up monitoring/alerts

Your DSA Progress Tracker is now live and ready for students and administrators to use!