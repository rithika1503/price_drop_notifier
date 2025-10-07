// Amazon Price Monitor - Content Script
// This script runs on Amazon product pages to extract product information

class AmazonProductExtractor {
    constructor() {
        this.productData = null;
        this.init();
    }

    init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.extractProductInfo());
        } else {
            this.extractProductInfo();
        }

        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'getProductInfo':
                    this.extractProductInfo();
                    sendResponse(this.productData);
                    break;
                case 'getCurrentPrice':
                    sendResponse(this.extractPrice());
                    break;
            }
        });
    }

    extractProductInfo() {
        try {
            // Check if we're on a product page
            if (!this.isProductPage()) {
                console.log('Not on an Amazon product page');
                return null;
            }

            const asin = this.extractASIN();
            const title = this.extractTitle();
            const price = this.extractPrice();
            const image = this.extractMainImage();
            const rating = this.extractRating();
            const reviewCount = this.extractReviewCount();

            this.productData = {
                asin,
                url: window.location.href,
                title,
                currentPrice: price,
                originalPrice: price, // Initially same as current price
                image,
                rating,
                reviewCount,
                extractedAt: new Date().toISOString(),
                priceHistory: [{
                    date: new Date().toISOString().split('T')[0],
                    price: price
                }]
            };

            console.log('Extracted product data:', this.productData);
            return this.productData;

        } catch (error) {
            console.error('Error extracting product info:', error);
            return null;
        }
    }

    isProductPage() {
        // Check various indicators that this is a product page
        const indicators = [
            () => window.location.pathname.includes('/dp/'),
            () => window.location.pathname.includes('/gp/product/'),
            () => document.getElementById('productTitle'),
            () => document.querySelector('[data-asin]'),
            () => document.querySelector('#ASIN')
        ];

        return indicators.some(check => {
            try {
                return check();
            } catch {
                return false;
            }
        });
    }

    extractASIN() {
        // Try multiple methods to extract ASIN
        const methods = [
            // From URL
            () => {
                const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
                return match ? match[1] : null;
            },
            // From hidden input
            () => {
                const asinInput = document.getElementById('ASIN');
                return asinInput ? asinInput.value : null;
            },
            // From data attribute
            () => {
                const element = document.querySelector('[data-asin]');
                return element ? element.getAttribute('data-asin') : null;
            },
            // From script tag
            () => {
                const scripts = document.getElementsByTagName('script');
                for (let script of scripts) {
                    const content = script.textContent;
                    if (content.includes('ASIN')) {
                        const match = content.match(/"ASIN"\\s*:\\s*"([A-Z0-9]{10})"/);
                        if (match) return match[1];
                    }
                }
                return null;
            }
        ];

        for (let method of methods) {
            try {
                const asin = method();
                if (asin && asin.length === 10) {
                    return asin;
                }
            } catch (error) {
                console.error('Error in ASIN extraction method:', error);
            }
        }

        console.warn('Could not extract ASIN from page');
        return null;
    }

    extractTitle() {
        const selectors = [
            '#productTitle',
            '#title',
            '.product-title',
            'h1.a-size-large',
            'h1 span.a-size-large'
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        console.warn('Could not extract product title');
        return 'Unknown Product';
    }

    extractPrice() {
        const selectors = [
            // New price formats
            '.a-price .a-offscreen',
            '.a-price-whole',
            
            // Deal price
            '#priceblock_dealprice',
            '#priceblock_ourprice',
            
            // Sale price
            '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
            
            // Regular price
            '.a-price-range .a-price .a-offscreen',
            
            // Kindle price
            '#kindle-price .a-price .a-offscreen',
            
            // Used/new prices
            '.a-color-price.a-size-medium.a-color-price',
            
            // Generic price selectors
            '.a-price',
            '.price',
            '[data-a-price]'
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                let priceText = element.textContent || element.getAttribute('data-a-price');
                if (priceText) {
                    // Clean and parse price
                    priceText = priceText.replace(/[^0-9.,]/g, '');
                    const price = parseFloat(priceText.replace(',', ''));
                    
                    if (!isNaN(price) && price > 0) {
                        return price;
                    }
                }
            }
        }

        console.warn('Could not extract product price');
        return null;
    }

    extractMainImage() {
        const selectors = [
            '#landingImage',
            '#imgBlkFront',
            '#ebooksImgBlkFront',
            '.a-dynamic-image',
            '#main-image img',
            '.item-image img'
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.src || element.getAttribute('data-src');
            }
        }

        return null;
    }

    extractRating() {
        const selectors = [
            '.a-icon-alt',
            '.a-star-medium .a-icon-alt',
            '[data-hook="average-star-rating"] .a-icon-alt'
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const ratingText = element.textContent;
                const match = ratingText.match(/(\\d+\\.\\d+)/);
                if (match) {
                    return parseFloat(match[1]);
                }
            }
        }

        return null;
    }

    extractReviewCount() {
        const selectors = [
            '#acrCustomerReviewText',
            '[data-hook="total-review-count"]',
            '.a-link-normal .a-size-base'
        ];

        for (let selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const countText = element.textContent;
                const match = countText.match(/(\\d+[,\\d]*)/);
                if (match) {
                    return parseInt(match[1].replace(/,/g, ''));
                }
            }
        }

        return null;
    }

    // Method to add a floating button for quick tracking
    addQuickTrackButton() {
        if (document.getElementById('priceTrackerBtn')) return;

        const button = document.createElement('button');
        button.id = 'priceTrackerBtn';
        button.innerHTML = '📊 Track Price';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: #ff9900;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            const productData = this.extractProductInfo();
            if (productData) {
                chrome.runtime.sendMessage({
                    action: 'addProduct',
                    productData
                });
                button.textContent = '✓ Tracking';
                button.style.background = '#28a745';
                setTimeout(() => {
                    button.textContent = '📊 Track Price';
                    button.style.background = '#ff9900';
                }, 2000);
            }
        });

        document.body.appendChild(button);
    }

    // Method to highlight price changes
    highlightPriceChanges() {
        const priceElements = document.querySelectorAll('.a-price, .price');
        priceElements.forEach(element => {
            element.style.cssText += `
                background: linear-gradient(45deg, #fff3cd, #ffffff);
                padding: 2px 4px;
                border-radius: 3px;
                border-left: 3px solid #ff9900;
            `;
        });
    }
}

// Initialize content script
const extractor = new AmazonProductExtractor();

// Add quick track button if on product page
if (extractor.isProductPage()) {
    extractor.addQuickTrackButton();
    extractor.highlightPriceChanges();
}

console.log('Amazon Price Monitor content script loaded');