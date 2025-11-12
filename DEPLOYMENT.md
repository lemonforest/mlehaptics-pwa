# Deployment Guide for MLEHaptics PWA

## Quick Deployment Options

This guide covers deploying the MLEHaptics PWA to production with HTTPS support.

## Option 1: Netlify (Recommended - Easiest)

### Prerequisites
- GitHub account
- Netlify account (free tier available)

### Method A: Deploy via GitHub (Recommended)

1. Push your code to GitHub:
   ```bash
   git push origin main
   ```

2. Go to [Netlify](https://netlify.com) and sign in

3. Click "Add new site" → "Import an existing project"

4. Select GitHub and authorize Netlify

5. Choose your repository: `mlehaptics-pwa`

6. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - Click "Deploy site"

7. Your site will be live at: `https://random-name.netlify.app`

8. (Optional) Configure custom domain in Site settings → Domain management

### Method B: Deploy via CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Follow prompts to create/link site

5. Access your site at the provided URL

### Netlify Features
- ✅ Free HTTPS with auto-renewal
- ✅ Automatic deployments on git push
- ✅ Deploy previews for PRs
- ✅ Custom domains supported
- ✅ CDN included
- ✅ No configuration needed

## Option 2: Vercel

### Prerequisites
- GitHub account
- Vercel account (free tier available)

### Deploy Steps

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Follow prompts:
   - Link to existing project or create new
   - Set build command: `npm run build`
   - Set output directory: `dist`

4. Your site will be live at: `https://your-project.vercel.app`

### Vercel Features
- ✅ Free HTTPS with auto-renewal
- ✅ Automatic deployments on git push
- ✅ Edge network (fast globally)
- ✅ Custom domains supported
- ✅ Analytics available

## Option 3: GitHub Pages

### Prerequisites
- GitHub account
- Repository on GitHub

### Deploy Steps

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:
   ```json
   {
     "scripts": {
       "deploy": "vite build && gh-pages -d dist"
     }
   }
   ```

3. Update `vite.config.ts` to set base path:
   ```typescript
   export default defineConfig({
     base: '/mlehaptics-pwa/', // Replace with your repo name
     // ... rest of config
   });
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

5. Enable GitHub Pages:
   - Go to repo Settings → Pages
   - Source: Deploy from branch
   - Branch: `gh-pages` → `/ (root)`
   - Save

6. Access at: `https://yourusername.github.io/mlehaptics-pwa/`

### GitHub Pages Limitations
- ⚠️ Takes ~1-2 minutes to deploy
- ⚠️ Must update `base` in vite.config for routing
- ✅ Free HTTPS included
- ✅ Custom domains supported

## Option 4: Self-Hosted (Advanced)

### Requirements
- Web server (Nginx, Apache, Caddy)
- Domain name
- SSL certificate (Let's Encrypt recommended)

### Example: Nginx with Let's Encrypt

1. Build the project:
   ```bash
   npm run build
   ```

2. Copy `dist/` to server:
   ```bash
   scp -r dist/* user@yourserver:/var/www/mlehaptics
   ```

3. Configure Nginx:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name mlehaptics.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/mlehaptics.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/mlehaptics.yourdomain.com/privkey.pem;

       root /var/www/mlehaptics;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Enable CORS for Web Bluetooth (if needed)
       add_header Access-Control-Allow-Origin *;
   }

   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name mlehaptics.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   ```

4. Get SSL certificate:
   ```bash
   sudo certbot --nginx -d mlehaptics.yourdomain.com
   ```

5. Restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

## Testing on Android

After deployment, test on Android:

1. Open Chrome on Android

2. Navigate to your deployed URL (e.g., `https://your-app.netlify.app`)

3. Test Web Bluetooth:
   - Tap "Connect Device"
   - Grant Bluetooth permission
   - Select MLEHaptics device
   - Verify connection and controls work

4. Install as PWA:
   - Tap menu (⋮) → "Install app"
   - Add to home screen
   - Launch from home screen

5. Test offline:
   - Enable airplane mode
   - Open installed PWA
   - Verify UI loads (Bluetooth won't work offline)

## Environment Variables (Optional)

If you need environment variables (API keys, etc.), create `.env` file:

```env
VITE_API_URL=https://api.example.com
VITE_APP_VERSION=1.0.0
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Continuous Deployment

### Netlify/Vercel Auto-Deploy

Both services automatically deploy when you push to GitHub:

1. Link your repository in dashboard
2. Configure build settings (done once)
3. Every push to `main` triggers deployment
4. Deploy previews created for PRs

### GitHub Actions (Custom)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PWA

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2
      with:
        publish-dir: './dist'
        production-branch: main
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Performance Optimization

Before deploying, optimize performance:

1. **Analyze bundle size:**
   ```bash
   npm run build
   npx vite-bundle-visualizer
   ```

2. **Enable compression** (already included in Vite build)

3. **Optimize images** (if you add icons):
   ```bash
   npm install -D vite-plugin-imagemin
   ```

4. **Test with Lighthouse:**
   - Open deployed site in Chrome
   - DevTools → Lighthouse
   - Run audit
   - Target: 90+ PWA score

## Security Checklist

Before going live:

- ✅ HTTPS enabled (required for Web Bluetooth)
- ✅ No sensitive data in client code
- ✅ Content Security Policy headers (optional but recommended)
- ✅ CORS properly configured
- ✅ Dependencies up to date: `npm audit`

## Monitoring & Analytics

### Option 1: Netlify Analytics
- Built-in, no JavaScript needed
- $9/month per site

### Option 2: Google Analytics
1. Add to `index.html`:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   ```

### Option 3: Plausible (Privacy-friendly)
- Self-hosted or cloud
- GDPR compliant
- Lightweight

## Rollback & Versioning

### Netlify/Vercel
- Keep previous deployments
- One-click rollback in dashboard
- Preview deployments for testing

### Manual Versioning
Update `package.json` version before each release:
```json
{
  "version": "1.1.0"
}
```

Tag releases in Git:
```bash
git tag -a v1.1.0 -m "Release 1.1.0"
git push origin v1.1.0
```

## Troubleshooting Deployment

### Build Fails
- Check Node.js version: Use 18.x or 20.x
- Clear cache: `rm -rf node_modules && npm install`
- Check build locally: `npm run build`

### PWA Not Installing
- Verify HTTPS is enabled
- Check manifest.json is accessible
- Test service worker registration in DevTools

### Web Bluetooth Not Working
- **Most common:** Not using HTTPS
- Check browser support (Chrome/Edge/Opera only)
- Verify permissions granted
- Check device is advertising

## Support

For deployment issues:
- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

## Next Steps

1. Choose deployment platform
2. Deploy to production
3. Test on Android device
4. Share URL with users
5. Monitor analytics
6. Iterate and improve!
