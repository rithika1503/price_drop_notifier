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



### Monitoring Prices

- The extension checks prices every 4 hours automatically
- Manual price checks: Click the refresh button next to any product
- Price drop notifications appear as Chrome notifications
- View price history in the main web application

### Managing Products

- **Remove products**: Click the trash icon next to any tracked product
- **Check specific price**: Click the refresh icon next to any product
- **View details**: Products show current price, original price, and last check time


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


## License

This extension is provided as-is for educational and personal use. Respect Amazon's terms of service when using automated tools.