#!/bin/bash

echo "🚀 Starting production deployment for alugazap.com..."

# 1. Build the application for production
echo "📦 Building application..."
npm run build

# 2. Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build completed successfully!"

# 3. Start production server locally for testing
echo "🔧 Starting production server locally on port 8080..."
echo "📌 Access at: http://localhost:8080"
echo ""
echo "⚠️  To deploy to alugazap.com server, you need to:"
echo "   1. Copy the built files to your server"
echo "   2. Install dependencies: npm ci --production"
echo "   3. Set environment variables from .env.production"
echo "   4. Run: npm start (or use PM2 for process management)"
echo ""
echo "🌐 For Netlify deployment:"
echo "   git push origin main (auto-deploy configured)"
echo ""
echo "Starting local production test server..."
npm start