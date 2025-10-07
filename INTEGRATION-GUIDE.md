# Amazon Price Monitor - Full Stack Setup Guide

## 🚀 Complete Integration: Chrome Extension + Node.js Backend

This guide shows how to set up the complete system with both the Chrome extension frontend and Node.js backend for robust Amazon price tracking with email notifications.

## 📁 Project Structure

```
amazon-price-monitor/
├── backend/                    # Node.js Backend Server
│   ├── enhanced-app.js        # Main server file
│   ├── updated-package.json   # Dependencies
│   ├── .env                   # Environment variables
│   └── package-lock.json      # Lock file
├── extension/                 # Chrome Extension
│   ├── manifest.json         # Extension manifest
│   ├── popup.html            # Extension popup
│   ├── enhanced-popup.js     # Enhanced popup with backend integration
│   ├── popup-styles.css      # Popup styling  
│   ├── enhanced-background.js # Service worker with backend calls
│   ├── content.js            # Amazon page content script
│   └── icons/                # Extension icons
│       ├── icon16.png
│       ├── icon32.png
│       ├── icon48.png
│       └── icon128.png
└── README.md                 # This file
```

## 🛠️ Backend Setup

### 1. Setup Backend Directory
```bash
mkdir amazon-price-monitor
cd amazon-price-monitor
mkdir backend
cd backend
```

### 2. Install Dependencies
```bash
# Copy the enhanced files I created
cp enhanced-app.js app.js
cp updated-package.json package.json

# Install dependencies
npm install

# If you need CORS (for extension communication)
npm install cors
```

### 3. Environment Configuration
```bash
# Create .env file
touch .env
```

Add to `.env`:
```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=your_email@domain.com
PORT=3000
NODE_ENV=development
```

### 4. Get SendGrid API Key
1. Go to [SendGrid](https://sendgrid.com/)
2. Create account → API Keys → Create API Key
3. Copy key to `.env` file

### 5. Start Backend Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

Backend will run on `http://localhost:3000`

## 🎯 Extension Setup

### 1. Setup Extension Directory
```bash
cd ../
mkdir extension
cd extension
```

### 2. Copy Extension Files
Copy these enhanced files I created:
- `enhanced-popup.js` → `popup.js`  
- `enhanced-background.js` → `background.js`
- All other files (manifest.json, popup.html, etc.)

### 3. Load Extension in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your `extension/` folder

## 🔗 Backend API Endpoints

The enhanced backend provides these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/products` | Add product for tracking |
| GET | `/products/:email` | Get all products for user |
| POST | `/check-price` | Check specific product price |
| POST | `/check-all` | Check all products (bulk) |
| DELETE | `/products/:id` | Remove product |
| GET | `/health` | Server health check |

## 🌟 Key Features

### Backend Advantages:
- **📧 Email Notifications**: Rich HTML email alerts via SendGrid
- **🕷️ Robust Scraping**: Nightmare.js headless browser for reliable price extraction
- **📊 Price History**: Server-side storage of price trends
- **⚡ Bulk Operations**: Check all products efficiently
- **🔄 Fallback Support**: Extension works even if backend is down

### Extension Advantages:
- **🖱️ Easy Product Adding**: One-click from Amazon pages
- **🔔 Chrome Notifications**: Instant desktop alerts
- **💾 Local Backup**: Data stored locally + backend
- **🎯 Real-time Updates**: Live price checking from popup

## 🔧 Configuration

### Backend Configuration (enhanced-app.js)
```javascript
const BACKEND_URL = 'http://localhost:3000'; // Change if deploying elsewhere
```

### Extension Configuration
Update these in `enhanced-popup.js` and `enhanced-background.js`:
```javascript
this.BACKEND_URL = 'http://localhost:3000'; // Your backend URL
```

## 📱 Usage Flow

1. **Start Backend**: `npm run dev` in backend directory
2. **Install Extension**: Load unpacked in Chrome
3. **Add Products**: 
   - Visit Amazon product page → Click extension → "Track This Product"
   - Or paste Amazon URL in extension popup
4. **Set Target Price**: Optional target price for alerts
5. **Get Notifications**: 
   - Chrome notifications (immediate)
   - Email alerts (from backend)
6. **Monitor**: Backend checks every 4 hours automatically

## 🚨 Email Notifications

When price drops, users receive:

**Chrome Notification:**
```
🔔 Price Drop Detected!
Price dropped 15% to ₹49.99
```

**Email Notification:**
```
Subject: 🔥 Amazon Price Drop Alert - 15% off!

Great news! The price for "Echo Dot (4th Gen)" has dropped 
from ₹59.99 to ₹49.99 (15% off).

[View on Amazon Button]
```

## 🔒 Security Considerations

- **CORS**: Enabled for extension communication
- **Rate Limiting**: 2-second delays between Amazon requests
- **Error Handling**: Graceful fallbacks when backend unavailable
- **Data Validation**: Input validation on all API endpoints

## 🐛 Troubleshooting

### Backend Issues:
```bash
# Check if server is running
curl http://localhost:3000/health

# Check logs
npm run dev # Shows console output

# Install missing dependencies
npm install
```

### Extension Issues:
```bash
# Check extension console
Right-click extension icon → Inspect popup

# Check background script
chrome://extensions → Extension details → Inspect views
```

### Common Fixes:
- **CORS errors**: Ensure backend has `cors` enabled
- **Connection failed**: Check backend is running on port 3000
- **SendGrid errors**: Verify API key in `.env`
- **Amazon scraping fails**: Amazon may have changed selectors

## 🚀 Deployment Options

### Backend Deployment:
- **Local**: `npm start` (port 3000)
- **Heroku**: Add Procfile, set environment variables
- **Railway**: Connect GitHub repo, auto-deploy
- **DigitalOcean**: Docker container deployment

### Extension Distribution:
- **Development**: Load unpacked (what we're doing)
- **Chrome Web Store**: Package and submit for review
- **Enterprise**: Distribute .crx file internally

## 📈 Monitoring

Backend provides metrics:
- Total tracked products
- Email delivery status  
- Price check success rates
- Error logs and debugging info

## 🎯 Next Steps

1. **Start with basic setup** - get backend + extension running locally
2. **Test with real products** - add some Amazon URLs
3. **Configure email** - set up SendGrid for notifications  
4. **Monitor logs** - check console for any issues
5. **Scale up** - add more products, users, features

The system now provides enterprise-grade price monitoring with both instant browser notifications and professional email alerts!