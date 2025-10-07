require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

const puppeteer = require('puppeteer');

const port = process.env.PORT || 3000;
const sgMail = require('@sendgrid/mail');

// Middleware
app.use(cors()); // Enable CORS for Chrome extension
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

let SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(SENDGRID_API_KEY);

// In-memory storage for tracking products (use database in production)
const trackedProducts = new Map();

// Enhanced email function
function sendEmail(userEmail, productTitle, url, oldPrice, newPrice, dropPercentage) {
    let message = {
        to: userEmail,
        from: process.env.FROM_EMAIL || 'sannidhirithika@gmail.com',
        subject: `🔥 Amazon Price Drop Alert - ${dropPercentage}% off!`,
        text: `Great news! The price for "${productTitle}" has dropped from ${oldPrice} to ${newPrice} (${dropPercentage}% off).\n\nView product: ${url}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff9900;">🔥 Price Drop Alert!</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">${productTitle}</h3>
                    <div style="display: flex; align-items: center; gap: 10px; margin: 15px 0;">
                        <span style="text-decoration: line-through; color: #666;">${oldPrice}</span>
                        <span style="font-size: 24px; font-weight: bold; color: #28a745;">${newPrice}</span>
                        <span style="background: #ff4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${dropPercentage}% OFF</span>
                    </div>
                    <a href="${url}" style="display: inline-block; background: #ff9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px;">View on Amazon</a>
                </div>
                <p style="color: #666; font-size: 12px;">This alert was sent by Amazon Price Monitor. To stop receiving alerts, please contact us.</p>
            </div>
        `
    };

    return sgMail.send(message);
}

// Enhanced price checking with better selectors
const checkPrice = async (url, targetPrice, userEmail, productId) => {
  

    try {
        console.log(`Checking price for product ${productId}: ${url}`);
         // ***** NEW PUPPETEER CODE *****
         const browser = await puppeteer.launch({ headless: true });
         const page = await browser.newPage();
         await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
            
            const result = await page.evaluate(() => {
                const selectors = [
                    '.a-price .a-offscreen',
                    '.a-price-whole',
                    '#priceblock_dealprice',
                    '#priceblock_ourprice',
                    '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
                    '.a-price-range .a-price .a-offscreen'
                ];
    
                let price = null;
                let title = '';
    
                for (let selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const priceText = element.textContent.trim();
                        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                        if (priceMatch) {
                            price = priceMatch[0].replace(/,/g, '');
                            break;
                        }
                    }
                }
    
                const titleSelectors = ['#productTitle', '#title', 'h1.a-size-large'];
                for (let selector of titleSelectors) {
                    const titleElement = document.querySelector(selector);
                    if (titleElement) {
                        title = titleElement.textContent.trim();
                        break;
                    }
                }
    
                return { price, title };
            });
            await browser.close();
    


        if (!result.price) {
            throw new Error('Could not extract price from page');
        }

        const currentPrice = parseFloat(result.price);
        const productTitle = result.title || 'Amazon Product';
        
        // Get stored product info
        const storedProduct = trackedProducts.get(productId) || {};
        const previousPrice = storedProduct.lastPrice || currentPrice;

        // Update stored product info
        trackedProducts.set(productId, {
            ...storedProduct,
            url,
            title: productTitle,
            lastPrice: currentPrice,
            targetPrice,
            userEmail,
            lastChecked: new Date(),
            priceHistory: [
                ...(storedProduct.priceHistory || []),
                { price: currentPrice, date: new Date() }
            ].slice(-30) // Keep last 30 price records
        });

        console.log(`Current price: ${currentPrice}, Target price: ${targetPrice}, Previous price: ${previousPrice}`);

        // Check if price dropped below target OR dropped from previous price
        if (currentPrice <= targetPrice || currentPrice < previousPrice) {
            const dropPercentage = previousPrice > currentPrice ? 
                Math.round(((previousPrice - currentPrice) / previousPrice) * 100) : 0;

            const oldPriceFormatted = `₹${previousPrice.toFixed(2)}`;
            const newPriceFormatted = `₹${currentPrice.toFixed(2)}`;

            await sendEmail(userEmail, productTitle, url, oldPriceFormatted, newPriceFormatted, dropPercentage);
            console.log(`Email sent to ${userEmail} - Price drop detected!`);

            return {
                success: true,
                priceDrop: true,
                currentPrice,
                previousPrice,
                dropPercentage,
                message: 'Price drop detected! Email sent.'
            };
        } else {
            console.log('Price is still higher than target');
            return {
                success: true,
                priceDrop: false,
                currentPrice,
                previousPrice,
                message: 'No price drop detected'
            };
        }

    } catch (err) {
        console.error('Error checking price:', err);
        return {
            success: false,
            error: err.message
        };
    }
};

// API Routes

// Add product for tracking
app.post('/products', async (req, res) => {
    try {
        const { email, prodUrl, price, productId, title } = req.body;
        
        if (!email || !prodUrl || !price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: email, prodUrl, price' 
            });
        }

        console.log(`${email} added product for tracking: ${prodUrl}`);
        
        // Store product for tracking
        const id = productId || `product_${Date.now()}`;
        trackedProducts.set(id, {
            url: prodUrl,
            title: title || 'Amazon Product',
            targetPrice: parseFloat(price),
            userEmail: email,
            lastChecked: new Date(),
            priceHistory: []
        });

        // Immediately check price
        const result = await checkPrice(prodUrl, parseFloat(price), email, id);
        
        res.json({ 
            success: true, 
            productId: id,
            message: 'Product added for tracking',
            initialCheck: result
        });

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Check specific product price
app.post('/check-price', async (req, res) => {
    try {
        const { productId } = req.body;
        
        const product = trackedProducts.get(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                error: 'Product not found' 
            });
        }

        const result = await checkPrice(
            product.url, 
            product.targetPrice, 
            product.userEmail, 
            productId
        );

        res.json(result);

    } catch (error) {
        console.error('Error checking price:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get all tracked products for a user
app.get('/products/:email', (req, res) => {
    try {
        const userEmail = req.params.email;
        const userProducts = [];

        trackedProducts.forEach((product, id) => {
            if (product.userEmail === userEmail) {
                userProducts.push({
                    id,
                    ...product
                });
            }
        });

        res.json({ 
            success: true, 
            products: userProducts 
        });

    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Remove product from tracking
app.delete('/products/:id', (req, res) => {
    try {
        const productId = req.params.id;
        
        if (trackedProducts.delete(productId)) {
            res.json({ 
                success: true, 
                message: 'Product removed from tracking' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Product not found' 
            });
        }

    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Bulk check all products (for scheduled tasks)
app.post('/check-all', async (req, res) => {
    try {
        const results = [];
        
        for (let [productId, product] of trackedProducts) {
            try {
                const result = await checkPrice(
                    product.url,
                    product.targetPrice,
                    product.userEmail,
                    productId
                );
                results.push({ productId, ...result });
                
                // Add delay to avoid overwhelming Amazon
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                results.push({ 
                    productId, 
                    success: false, 
                    error: error.message 
                });
            }
        }

        res.json({ 
            success: true, 
            results,
            totalChecked: results.length
        });

    } catch (error) {
        console.error('Error in bulk check:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Amazon Price Monitor API is running',
        trackedProducts: trackedProducts.size,
        timestamp: new Date()
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Amazon Price Monitor Server listening on port ${port}`);
    console.log(`📧 Email notifications: ${SENDGRID_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`🔍 Ready to track Amazon prices!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;