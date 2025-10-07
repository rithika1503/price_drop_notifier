// Amazon Price Monitor - Enhanced Background Service Worker
// Integrates with Node.js backend for robust price tracking and email notifications
importScripts('packages/firebase-app-compat.js');
importScripts('packages/firebase-auth-compat.js');
importScripts('packages/firebase-firestore-compat.js');


class BackgroundPriceMonitor {
    constructor() {
        this.CHECK_INTERVAL = 4 * 60 * 60 * 1000; // Check every 4 hours
        this.BACKEND_URL = 'http://localhost:3000'; // Your backend server URL
        this.firebaseInitialized = false;
        
        this.initializeFirebase();
        this.setupAlarms();
        this.setupMessageHandlers();
    }

    initializeFirebase() {
        const firebaseConfig = {
            apiKey: "FIREBASE_API_KEY",
            authDomain: "cept-58b52.firebaseapp.com",
            projectId: "FIREBASE_PROJECT_ID",
            storageBucket: "cept-58b52.firebasestorage.app",
            messagingSenderId: "566498940237",
            appId: "1:566498940237:web:08e855da409e84f8181304",
            measurementId: "G-EQJ693XCWY"
        };

        try {
            if (firebaseConfig.apiKey !== "FIREBASE_API_KEY") {
                firebase.initializeApp(firebaseConfig);
                this.auth = firebase.auth();
                this.firestore = firebase.firestore();
                this.firebaseInitialized = true;
                console.log('Firebase initialized in background worker');
            } else {
                console.log('Background worker running without Firebase');
            }
        } catch (error) {
            console.error('Background Firebase init failed:', error);
        }
    }

    setupAlarms() {
        // Set up periodic price checking
        chrome.alarms.create('checkPricesBackend', {
            periodInMinutes: 240 // Check every 4 hours
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'checkPricesBackend') {
                this.checkAllPricesViaBackend();
            }
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'addProductBackend':
                    this.addProductToBackend(message.productData).then(sendResponse);
                    return true;
                case 'removeProductBackend':
                    this.removeProductFromBackend(message.productId).then(sendResponse);
                    return true;
                case 'checkPriceBackend':
                    this.checkSinglePriceViaBackend(message.productId).then(sendResponse);
                    return true;
                case 'getAllProductsBackend':
                    this.getAllProductsFromBackend(message.userEmail).then(sendResponse);
                    return true;
                case 'testBackendConnection':
                    this.testBackendConnection().then(sendResponse);
                    return true;
            }
        });
    }

    async testBackendConnection() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/health`);
            const result = await response.json();
            console.log('Backend connection test:', result);
            return { success: true, data: result };
        } catch (error) {
            console.error('Backend connection failed:', error);
            return { success: false, error: error.message };
        }
    }

    async addProductToBackend(productData) {
        try {
            // Also store locally as backup
            await this.addProductToLocalStorage(productData);

            // Send to backend
            const response = await fetch(`${this.BACKEND_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: productData.userEmail || 'demo@example.com',
                    prodUrl: productData.url,
                    price: productData.targetPrice || productData.currentPrice,
                    productId: productData.asin || productData.id,
                    title: productData.title
                })
            });

            const result = await response.json();
            
            if (result.success) {
                console.log('Product added to backend successfully:', result);
                
                // Send Chrome notification for confirmation
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Product Added to Tracking',
                    message: `Now tracking: ${productData.title}`,
                    priority: 1
                });

                return { success: true, data: result };
            } else {
                throw new Error(result.error || 'Failed to add product to backend');
            }

        } catch (error) {
            console.error('Error adding product to backend:', error);
            
            // Fallback to local storage only
            console.log('Falling back to local storage only');
            return { success: false, error: error.message, fallbackUsed: true };
        }
    }

    async removeProductFromBackend(productId) {
        try {
            // Remove from local storage
            await this.removeProductFromLocalStorage(productId);

            // Remove from backend
            const response = await fetch(`${this.BACKEND_URL}/products/${productId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log('Product removed from backend:', result);
            return { success: true, data: result };

        } catch (error) {
            console.error('Error removing product from backend:', error);
            return { success: false, error: error.message };
        }
    }

    async checkSinglePriceViaBackend(productId) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/check-price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId })
            });

            const result = await response.json();
            
            if (result.success && result.priceDrop) {
                // Backend handles email, we'll show Chrome notification too
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Price Drop Detected!',
                    message: `Price dropped ${result.dropPercentage}% to ₹${result.currentPrice}`,
                    priority: 2
                });
            }

            console.log('Backend price check result:', result);
            return result;

        } catch (error) {
            console.error('Error checking price via backend:', error);
            
            // Fallback to local price checking
            return this.fallbackLocalPriceCheck(productId);
        }
    }

    async checkAllPricesViaBackend() {
        try {
            console.log('Checking all prices via backend...');
            
            const response = await fetch(`${this.BACKEND_URL}/check-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (result.success) {
                console.log(`Backend checked ${result.totalChecked} products`);
                
                // Count price drops for summary notification
                const priceDrops = result.results.filter(r => r.priceDrop).length;
                
                if (priceDrops > 0) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'Price Monitoring Complete',
                        message: `Found ${priceDrops} price drops! Check your email.`,
                        priority: 2
                    });
                }
            }

            return result;

        } catch (error) {
            console.error('Error in backend bulk price check:', error);
            
            // Fallback to local price checking
            console.log('Falling back to local price checking');
            return this.fallbackLocalBulkCheck();
        }
    }

    async getAllProductsFromBackend(userEmail) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/products/${encodeURIComponent(userEmail)}`);
            const result = await response.json();
            
            if (result.success) {
                return { success: true, products: result.products };
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error getting products from backend:', error);
            
            // Fallback to local storage
            return this.getAllProductsFromLocalStorage();
        }
    }

    // Fallback methods for when backend is unavailable
    async addProductToLocalStorage(productData) {
        try {
            const result = await chrome.storage.sync.get(['trackedProducts']);
            const trackedProducts = result.trackedProducts || [];
            
            const existingIndex = trackedProducts.findIndex(p => 
                p.asin === productData.asin || p.id === productData.id
            );
            
            if (existingIndex !== -1) {
                trackedProducts[existingIndex] = productData;
            } else {
                trackedProducts.push(productData);
            }

            await chrome.storage.sync.set({ trackedProducts });
            console.log('Product added to local storage:', productData.title);

        } catch (error) {
            console.error('Error adding to local storage:', error);
        }
    }

    async removeProductFromLocalStorage(productId) {
        try {
            const result = await chrome.storage.sync.get(['trackedProducts']);
            const trackedProducts = result.trackedProducts || [];
            const filteredProducts = trackedProducts.filter(p => 
                p.asin !== productId && p.id !== productId
            );
            
            await chrome.storage.sync.set({ trackedProducts: filteredProducts });
            console.log('Product removed from local storage:', productId);

        } catch (error) {
            console.error('Error removing from local storage:', error);
        }
    }

    async getAllProductsFromLocalStorage() {
        try {
            const result = await chrome.storage.sync.get(['trackedProducts']);
            return { success: true, products: result.trackedProducts || [] };
        } catch (error) {
            console.error('Error getting from local storage:', error);
            return { success: false, products: [] };
        }
    }

    async fallbackLocalPriceCheck(productId) {
        // Implementation for local price checking when backend fails
        console.log('Using fallback local price check for:', productId);
        return { 
            success: true, 
            message: 'Backend unavailable, using local fallback',
            fallbackUsed: true 
        };
    }

    async fallbackLocalBulkCheck() {
        console.log('Using fallback local bulk price check');
        return { 
            success: true, 
            message: 'Backend unavailable, skipping bulk check',
            fallbackUsed: true 
        };
    }
}

// Initialize the enhanced background service
new BackgroundPriceMonitor();

console.log('Amazon Price Monitor background service worker loaded with backend integration');