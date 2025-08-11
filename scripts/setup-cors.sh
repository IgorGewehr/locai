#!/bin/bash

echo "🔧 Firebase Storage CORS Configuration Setup"
echo "============================================="
echo ""
echo "This script will help you configure CORS for Firebase Storage to fix upload issues."
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil is not installed. Please install it first:"
    echo ""
    echo "Option 1: Install via gcloud SDK"
    echo "  - Download from: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "Option 2: Install via npm (easier for development)"
    echo "  npm install -g @google-cloud/storage-tools"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo "✅ gsutil found!"
echo ""

# Get the storage bucket name
BUCKET_NAME="locai-76dcf.appspot.com"
echo "📦 Storage bucket: gs://$BUCKET_NAME"
echo ""

# Apply CORS configuration
echo "🚀 Applying CORS configuration..."
echo ""

# For development (allows all origins)
echo "For DEVELOPMENT environment (allows all origins):"
echo "  gsutil cors set cors.json gs://$BUCKET_NAME"
echo ""

# For production (restricted origins)
echo "For PRODUCTION environment (restricted origins):"
echo "  gsutil cors set cors-production.json gs://$BUCKET_NAME"
echo ""

echo "📝 Manual steps to apply CORS:"
echo "1. Make sure you're logged in to gcloud:"
echo "   gcloud auth login"
echo ""
echo "2. Set your project:"
echo "   gcloud config set project locai-76dcf"
echo ""
echo "3. Apply CORS configuration (choose one):"
echo "   Development: gsutil cors set cors.json gs://$BUCKET_NAME"
echo "   Production:  gsutil cors set cors-production.json gs://$BUCKET_NAME"
echo ""
echo "4. Verify CORS configuration:"
echo "   gsutil cors get gs://$BUCKET_NAME"
echo ""

# Try to apply automatically if possible
read -p "Do you want to apply DEVELOPMENT CORS configuration now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gsutil cors set cors.json gs://$BUCKET_NAME
    echo "✅ CORS configuration applied!"
    echo ""
    echo "Verifying configuration:"
    gsutil cors get gs://$BUCKET_NAME
fi