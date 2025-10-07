# Amazon Price Monitor Chrome Extension

A Chrome extension that tracks Amazon product prices and sends notifications when prices drop. Built with JavaScript and Firebase authentication.

## Features

- 🔐 **Firebase Authentication** - Secure Google sign-in
- 📊 **Price Tracking** - Monitor multiple Amazon products
- 🔔 **Price Drop Alerts** - Get notified when prices decrease  
- 📈 **Price History** - View historical price data
- ⚡ **Background Monitoring** - Automatic price checks every 4 hours
- 🎯 **Quick Add** - Add products directly from Amazon pages
- 💾 **Cloud Sync** - Data synced across devices via Firestore

## Installation

### 1. Download the Extension Files
Save these files to a folder on your computer:
- `manifest.json`
- `popup.html` 
- `popup.js`
- `popup-styles.css`
- `background.js`
- `content.js`

### 2. Set Up Firebase (Optional)
For full functionality with authentication and cloud sync:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication with Google sign-in
4. Enable Firestore Database
5. Get your Firebase config object
6. Replace the placeholder config in `background.js` and `popup.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id", 
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the folder containing your extension files
5. The extension should now appear in your extensions list

### 4. Create Extension Icons (Optional)
Create icon files and save them in an `icons/` folder:
- `icon16.png` (16x16px)
- `icon32.png` (32x32px) 
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

## Usage

### Adding Products

**Method 1: From Extension Popup**
1. Click the extension icon in your browser toolbar
2. Sign in with Google (or use demo mode)
3. Paste an Amazon product URL in the input field
4. Click "Add to Track"

**Method 2: From Amazon Pages** 
1. Visit any Amazon product page
2. Click the extension icon
3. Click "Track This Product" button
4. Product will be automatically added

### Monitoring Prices

- The extension checks prices every 4 hours automatically
- Manual price checks: Click the refresh button next to any product
- Price drop notifications appear as Chrome notifications
- View price history in the main web application

### Managing Products

- **Remove products**: Click the trash icon next to any tracked product
- **Check specific price**: Click the refresh icon next to any product
- **View details**: Products show current price, original price, and last check time

## File Structure

```
amazon-price-tracker/
├── manifest.json          # Extension manifest (Chrome Extension config)
├── popup.html            # Extension popup interface  
├── popup.js              # Popup functionality and Firebase auth
├── popup-styles.css      # Popup styling
├── background.js         # Service worker for background price monitoring
├── content.js            # Content script for Amazon page interaction
└── icons/               # Extension icons (optional)
    ├── icon16.png
    ├── icon32.png  
    ├── icon48.png
    └── icon128.png
```

## Technical Details

### Chrome Extension Manifest V3
- Uses service workers instead of background pages
- Implements proper message passing between components
- Includes necessary permissions for Amazon domains

### Firebase Integration
- Authentication with Google OAuth
- Firestore for data persistence and sync
- Handles offline functionality gracefully

### Price Monitoring
- Extracts prices using multiple CSS selectors
- Handles different Amazon page layouts
- Stores price history with timestamps
- Calculates price drop percentages

### Security & Permissions
- `storage`: Store tracked products locally
- `notifications`: Send price drop alerts  
- `background`: Run periodic price checks
- `activeTab`: Access current Amazon pages
- Host permissions for Amazon domains

## Demo Mode

The extension includes a demo mode that works without Firebase setup:
- Simulated authentication
- Local storage only (no cloud sync)
- Sample price fluctuations for testing
- All core functionality available

## Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers (Edge, Brave, etc.)

## Limitations & Considerations

1. **Rate Limiting**: Amazon may block frequent requests
2. **Page Structure**: Amazon layout changes may affect price extraction
3. **Storage Limits**: Chrome sync storage has quota limits
4. **Background Limits**: Service workers have execution time limits

## Development

### Local Development
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click "Reload" button for your extension
4. Test changes in popup and on Amazon pages

### Debugging
- **Popup**: Right-click extension icon → "Inspect popup"
- **Background**: Extensions page → "Inspect views: service worker" 
- **Content Script**: Browser DevTools on Amazon pages

## Privacy & Data

- Product URLs and prices stored locally and in Firebase
- No personal data collected beyond what's needed for functionality
- Firebase authentication handles user data securely
- Extension only accesses Amazon product pages when explicitly tracking

## Support

For issues with:
- **Firebase setup**: Check Firebase documentation
- **Extension installation**: Verify all files are present and manifest is valid
- **Price extraction**: Amazon page structure may have changed
- **Notifications**: Check Chrome notification permissions

## License

This extension is provided as-is for educational and personal use. Respect Amazon's terms of service when using automated tools.