# Using MLEHaptics PWA on Android

## Requirements

- Android device with Bluetooth Low Energy (BLE) support
- Chrome browser (pre-installed on most Android devices)
- Android 6.0 (Marshmallow) or newer
- Location permission (required by Android for BLE scanning)

## Option 1: Using Local Development Server (Testing)

### Step 1: Run Development Server on Your Computer

```bash
npm run dev
```

This starts the server on `https://localhost:5173`

### Step 2: Find Your Computer's IP Address

**On Linux/Mac:**
```bash
ip addr show | grep "inet "
# or
ifconfig | grep "inet "
```

**On Windows:**
```bash
ipconfig
```

Look for your local network IP (usually starts with `192.168.x.x` or `10.x.x.x`)

### Step 3: Update Vite Config for Network Access

The current `vite.config.ts` already has `host: true`, so the dev server is accessible on your network.

### Step 4: Access from Android Chrome

On your Android device:
1. Open Chrome browser
2. Navigate to: `https://YOUR_COMPUTER_IP:5173` (e.g., `https://192.168.1.100:5173`)
3. You'll see a security warning (self-signed certificate) - click "Advanced" → "Proceed"
4. The PWA will load

**Note:** Chrome may block Web Bluetooth on insecure origins. If this happens, see the workaround below.

### Workaround for HTTPS Certificate Issues

If Web Bluetooth is blocked due to certificate issues:

1. On your Android device, open Chrome and go to:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```

2. Add your development server URL:
   ```
   http://YOUR_COMPUTER_IP:5173
   ```

3. Enable the flag and restart Chrome

4. Now access via HTTP: `http://YOUR_COMPUTER_IP:5173`

## Option 2: Deploy to Production (Recommended)

### Deploy to Free Hosting Services

#### Option A: Netlify (Easiest)

1. Build the project:
   ```bash
   npm run build
   ```

2. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Access the provided HTTPS URL from Android Chrome

#### Option B: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Access the provided HTTPS URL from Android Chrome

#### Option C: GitHub Pages

1. Install gh-pages:
   ```bash
   npm install -g gh-pages
   ```

2. Add to `package.json`:
   ```json
   "scripts": {
     "deploy": "vite build && gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

4. Access at `https://yourusername.github.io/mlehaptics-pwa`

### Access from Android

1. Open Chrome on Android
2. Navigate to your deployed URL (e.g., `https://your-app.netlify.app`)
3. The PWA will load with full HTTPS support

## Installing as Android App (PWA Installation)

Once you've accessed the PWA via HTTPS:

1. In Chrome, tap the menu (⋮) in the top-right
2. Select "Add to Home screen" or "Install app"
3. Name the app (e.g., "MLEHaptics")
4. Tap "Add"
5. The PWA icon will appear on your home screen

Now you can launch it like a native app!

## Using the App on Android

### 1. Enable Bluetooth

- Go to Settings → Bluetooth
- Turn Bluetooth ON
- **Important:** You do NOT need to pair the device in Android settings
- The app will handle discovery and connection directly

### 2. Grant Permissions

When you first tap "Connect Device", Chrome will ask for:
- **Bluetooth permission** - Tap "Allow"
- **Location permission** - Tap "Allow" (required by Android for BLE scanning)

### 3. Scan and Connect

1. Tap "Connect Device" button in the app
2. Chrome will show a scanning dialog with nearby BLE devices
3. Look for your MLEHaptics device (e.g., "EMDR-xxxx" or your device name)
4. Tap the device name
5. Tap "Pair" in the dialog
6. The app will connect and load current settings

### 4. Configure Device

- Use sliders and controls to adjust motor, LED, and session settings
- Changes are saved instantly to the device
- Monitor battery and session progress in real-time

### 5. Disconnect

- Tap "Disconnect" in the top-right
- Or simply close the app (BLE connection will terminate)

## Troubleshooting on Android

### "Web Bluetooth is not supported"

- Make sure you're using Chrome (not Samsung Internet, Firefox, etc.)
- Update Chrome to the latest version from Play Store
- Try accessing via HTTPS, not HTTP

### "Bluetooth adapter not available"

- Enable Bluetooth in Android Settings
- Grant Bluetooth permission when prompted
- Restart Chrome and try again

### "Location permission required"

Android requires location permission for BLE scanning (even though we don't use GPS):
- When prompted, tap "Allow"
- Or go to Settings → Apps → Chrome → Permissions → Location → Allow

### Device not appearing in scan list

- Make sure your MLEHaptics device is powered on
- Ensure device is advertising the Configuration Service
- Check device is within range (< 10 meters)
- Try restarting the scan by tapping "Connect Device" again
- Verify device is not already connected to nRF Connect or another app

### Connection fails or disconnects

- Move Android device closer to BLE device
- Ensure device battery is charged
- Close other apps that might be using Bluetooth
- Restart Bluetooth on Android (Settings → Bluetooth → OFF → ON)
- Clear Chrome cache: Settings → Apps → Chrome → Storage → Clear cache

### Certificate/HTTPS errors (development mode)

- Use the chrome://flags workaround described above
- Or deploy to a proper HTTPS host (Netlify, Vercel, etc.)

## Performance Tips

1. **Keep devices close** - BLE works best within 5 meters
2. **Avoid interference** - WiFi routers, microwaves can interfere
3. **Battery optimization** - Disable battery optimization for Chrome:
   - Settings → Apps → Chrome → Battery → Unrestricted
4. **Keep screen on** - BLE connection may drop if screen turns off
5. **Airplane mode WiFi** - If having issues, try enabling Airplane mode, then manually enable Bluetooth and WiFi

## Comparing with nRF Connect

| Feature | nRF Connect | MLEHaptics PWA |
|---------|-------------|----------------|
| Device scanning | ✅ Advanced RSSI, filters | ✅ Simple service filter |
| Manual characteristic R/W | ✅ Raw hex values | ❌ Not needed |
| User-friendly controls | ❌ Technical interface | ✅ Sliders, color pickers |
| Motor presets | ❌ Manual entry | ✅ One-tap presets |
| Real-time monitoring | ✅ Manual refresh | ✅ Auto-update notifications |
| Installation | Play Store app | PWA (no store needed) |

**Use nRF Connect for:** Low-level debugging, testing characteristics, viewing raw data

**Use MLEHaptics PWA for:** Easy device configuration, therapy sessions, monitoring

## Security & Privacy

- No data leaves your device (offline-first)
- No account or login required
- No analytics or tracking
- BLE communication is local only (device ↔ phone)
- Settings stored locally in browser cache
- Uninstall app to clear all data

## Battery Life

- BLE uses minimal battery (< 1% per hour)
- Notifications (session time, battery) use slightly more power
- Close app when not in use to save battery
- Device battery level is monitored in the app

## Next Steps

1. Deploy the PWA to HTTPS hosting (Netlify recommended)
2. Access from Android Chrome
3. Install to home screen
4. Scan and connect to your MLEHaptics device
5. Configure and monitor your therapy sessions!

For issues, check the main [README.md](./README.md) for additional troubleshooting.
