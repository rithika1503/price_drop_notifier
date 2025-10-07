// Amazon Price Monitor - Enhanced Popup Script
// Integrates with Node.js backend for robust price tracking

class PopupController {
    constructor() {
        this.currentUser = null;
        this.trackedProducts = [];
        this.BACKEND_URL = 'http://localhost:3000';
        this.demoMode = false;
        
        this.initializeFirebase();
        this.bindEvents();
        this.checkCurrentTab();
        this.testBackendConnection();
        this.checkAuthState();
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
            if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "FIREBASE_API_KEY") {
                firebase.initializeApp(firebaseConfig);
                this.auth = firebase.auth();
                this.firestore = firebase.firestore();
                console.log('Firebase initialized in popup');
            } else {
                console.log('Running popup without Firebase');
                this.demoMode = true;
                setTimeout(() => this.simulateDemoLogin(), 1000);
            }
        } catch (error) {
            console.error('Firebase initialization failed in popup:', error);
            this.demoMode = true;
            setTimeout(() => this.simulateDemoLogin(), 1000);
        }
    }

    simulateDemoLogin() {
        this.currentUser = {
            uid: 'demo-user',
            email: 'demo@example.com',
            displayName: 'Demo User'
        };
        this.showMainContent();
    }

    async testBackendConnection() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/health`);
            const result = await response.json();
            
            if (result.success) {
                console.log('Backend connected:', result.message);
                this.showNotification('Backend server connected', 'success');
                this.backendAvailable = true;
            }
        } catch (error) {
            console.warn('⚠️ Backend not available, using local mode:', error.message);
            this.backendAvailable = false;
            this.showNotification('Backend offline - using local mode', 'warning');
        }
    }

    bindEvents() {
        // Authentication
        document.getElementById('signInBtn').addEventListener('click', () => this.signIn());
        document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());

        // Product management
        document.getElementById('addProductForm').addEventListener('submit', (e) => this.handleAddProduct(e));
        document.getElementById('addCurrentPage').addEventListener('click', () => this.addCurrentPageProduct());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadTrackedProducts());
        
        // Backend test button (add to popup if needed)
        document.getElementById('retryBtn').addEventListener('click', () => this.testBackendConnection());
    }

    async checkCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && tab.url.includes('amazon.com') && tab.url.includes('/dp/')) {
                document.getElementById('currentPageInfo').style.display = 'block';
                
                chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Could not get product info from tab');
                    } else if (response) {
                        this.currentPageProduct = response;
                        document.querySelector('.info-text').textContent = 
                            `📍 ${response.title.substring(0, 30)}...`;
                    }
                });
            }
        } catch (error) {
            console.error('Error checking current tab:', error);
        }
    }

    checkAuthState() {
        if (this.demoMode || !this.auth) {
            return;
        }

        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.showMainContent();
                this.loadTrackedProducts();
            } else {
                this.showAuthSection();
            }
        });
    }

    async signIn() {
        if (this.demoMode) {
            this.simulateDemoLogin();
            return;
        }

        try {
            this.showLoading();
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            this.showError('Sign in failed: ' + error.message);
        }
    }

    async signOut() {
        try {
            if (!this.demoMode && this.auth) {
                await this.auth.signOut();
            } else {
                this.currentUser = null;
                this.showAuthSection();
            }
        } catch (error) {
            this.showError('Sign out failed: ' + error.message);
        }
    }

    async handleAddProduct(event) {
        event.preventDefault();
        const url = document.getElementById('productUrl').value.trim();
        const targetPrice = document.getElementById('targetPrice')?.value;
        
        if (!this.isValidAmazonUrl(url)) {
            this.showError('Please enter a valid Amazon product URL');
            return;
        }

        this.showLoading();
        
        try {
            let productData = await this.extractProductFromUrl(url);
            
            if (productData) {
                // Add target price if provided
                if (targetPrice && !isNaN(targetPrice)) {
                    productData.targetPrice = parseFloat(targetPrice);
                }
                
                productData.userEmail = this.currentUser?.email || 'demo@example.com';
                
                if (this.backendAvailable) {
                    await this.addProductViaBackend(productData);
                } else {
                    await this.addProductLocally(productData);
                }
                
                document.getElementById('productUrl').value = '';
                if (document.getElementById('targetPrice')) {
                    document.getElementById('targetPrice').value = '';
                }
                
                this.loadTrackedProducts();
                this.showNotification('Product added for tracking!', 'success');
            } else {
                this.showError('Could not extract product information from URL');
            }
        } catch (error) {
            this.showError('Failed to add product: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async addCurrentPageProduct() {
        if (!this.currentPageProduct) {
            this.showError('Could not get product information from current page');
            return;
        }

        this.showLoading();
        
        try {
            this.currentPageProduct.userEmail = this.currentUser?.email || 'demo@example.com';
            
            if (this.backendAvailable) {
                await this.addProductViaBackend(this.currentPageProduct);
            } else {
                await this.addProductLocally(this.currentPageProduct);
            }
            
            document.getElementById('currentPageInfo').style.display = 'none';
            this.loadTrackedProducts();
            this.showNotification('Current page product added!', 'success');
        } catch (error) {
            this.showError('Failed to add product: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async addProductViaBackend(productData) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: productData.userEmail,
                    prodUrl: productData.url,
                    price: productData.targetPrice || productData.currentPrice,
                    productId: productData.asin || productData.id,
                    title: productData.title
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Backend request failed');
            }

            console.log('Product added via backend:', result);
            
            // Also store locally as backup
            await this.addProductLocally(productData);
            
        } catch (error) {
            console.error('Backend add failed, using local fallback:', error);
            await this.addProductLocally(productData);
            throw new Error('Backend unavailable - added locally only');
        }
    }

    async addProductLocally(productData) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'addProduct',
                productData
            }, (response) => {
                resolve(response);
            });
        });
    }

    isValidAmazonUrl(url) {
        const amazonDomainPattern = /(amazon\.com|amazon\.in|amzn\.in)/;
        const productPathPattern = /\/dp\/[A-Z0-9]{10}/;
        return amazonDomainPattern.test(url) && productPathPattern.test(url);
      }

    async extractProductFromUrl(url) {
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
        if (!asinMatch) return null;

        const asin = asinMatch[1];
        
        return {
            asin,
            id: asin,
            url: url,
            title: `Product ${asin}`,
            currentPrice: Math.floor(Math.random() * 100) + 10,
            originalPrice: Math.floor(Math.random() * 100) + 10,
            image: 'https://via.placeholder.com/200x200?text=Product',
            extractedAt: new Date().toISOString(),
            priceHistory: [{
                date: new Date().toISOString().split('T')[0],
                price: Math.floor(Math.random() * 100) + 10
            }]
        };
    }

    async loadTrackedProducts() {
        try {
            let result;
            
            if (this.backendAvailable && this.currentUser?.email) {
                // Try to get from backend first
                try {
                    const response = await fetch(`${this.BACKEND_URL}/products/${encodeURIComponent(this.currentUser.email)}`);
                    const backendResult = await response.json();
                    
                    if (backendResult.success) {
                        result = backendResult.products || [];
                    } else {
                        throw new Error('Backend request failed');
                    }
                } catch (error) {
                    console.warn('Backend failed, using local storage:', error);
                    result = await this.getLocalProducts();
                }
            } else {
                // Use local storage
                result = await this.getLocalProducts();
            }
            
            this.trackedProducts = Array.isArray(result) ? result : [];
            this.renderProductsList();
            
        } catch (error) {
            console.error('Error loading tracked products:', error);
            this.showError('Failed to load tracked products');
            this.trackedProducts = [];
            this.renderProductsList();
        }
    }

    async getLocalProducts() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['trackedProducts'], (result) => {
                resolve(result.trackedProducts || []);
            });
        });
    }

    renderProductsList() {
        const container = document.getElementById('productsList');
        const countElement = document.getElementById('productCount');
        
        countElement.textContent = this.trackedProducts.length;

        if (this.trackedProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No products tracked yet</p>
                    <p class="empty-hint">Add an Amazon URL above to start tracking</p>
                    ${!this.backendAvailable ? '<p class="backend-status">⚠️ Backend offline - using local mode</p>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = this.trackedProducts.map(product => `
            <div class="product-item" data-id="${product.id || product.asin}">
                <div class="product-image">
                    <img src="${product.image || 'https://via.placeholder.com/50x50?text=📦'}" 
                         alt="${product.title}" onerror="this.src='https://via.placeholder.com/50x50?text=📦'">
                </div>
                <div class="product-info">
                    <h4 class="product-title">${this.truncateText(product.title, 40)}</h4>
                    <div class="product-price">
                        <span class="current-price">₹${(product.lastPrice || product.currentPrice || 0).toFixed(2)}</span>
                        ${product.targetPrice ? `<span class="target-price">Target: ₹${product.targetPrice.toFixed(2)}</span>` : ''}
                    </div>
                    <div class="product-meta">
                        <span class="last-checked">Last checked: ${this.formatDate(product.lastChecked)}</span>
                        ${this.backendAvailable ? '<span class="backend-badge">📧</span>' : '<span class="local-badge">💾</span>'}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-icon" onclick="popup.checkPrice('${product.id || product.asin}')" title="Check Price">🔄</button>
                    <button class="btn-icon" onclick="popup.removeProduct('${product.id || product.asin}')" title="Remove">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    async removeProduct(productId) {
        try {
            if (this.backendAvailable) {
                await fetch(`${this.BACKEND_URL}/products/${productId}`, {
                    method: 'DELETE'
                });
            }
            
            // Also remove locally
            chrome.runtime.sendMessage({
                action: 'removeProduct',
                productId
            });

            this.loadTrackedProducts();
            this.showNotification('Product removed', 'info');
        } catch (error) {
            this.showError('Failed to remove product: ' + error.message);
        }
    }

    async checkPrice(productId) {
        try {
            let result;
            
            if (this.backendAvailable) {
                const response = await fetch(`${this.BACKEND_URL}/check-price`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ productId })
                });
                result = await response.json();
            } else {
                result = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'checkPrice',
                        productId
                    }, resolve);
                });
            }

            if (result && result.success) {
                this.loadTrackedProducts();
                if (result.priceDrop) {
                    this.showNotification(`Price drop detected! ${result.dropPercentage}% off`, 'success');
                } else if (result.noChange) {
                    this.showNotification('No price change detected', 'info');
                }
            } else {
                this.showError('Failed to check price');
            }
        } catch (error) {
            this.showError('Failed to check price: ' + error.message);
        }
    }

    showAuthSection() {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('userInfo').style.display = 'none';
    }

    showMainContent() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('userInfo').style.display = 'flex';
        
        if (this.currentUser) {
            document.getElementById('userEmail').textContent = this.currentUser.email;
        }
    }

    showLoading() {
        document.getElementById('loadingState').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorState').style.display = 'block';
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        document.getElementById('errorState').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsList');
        container.style.display = 'block';
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) {
                container.style.display = 'none';
            }
        }, 3000);
    }

    truncateText(text, length) {
        return text && text.length > length ? text.substring(0, length) + '...' : text || '';
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
}

// Initialize popup when DOM is loaded
let popup;
document.addEventListener('DOMContentLoaded', () => {
    popup = new PopupController();
});

window.popup = popup;