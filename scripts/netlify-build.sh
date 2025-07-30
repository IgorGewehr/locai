#!/bin/bash
# Netlify build script with debugging

echo "Starting Netlify build..."
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf .next

# Run the build
echo "Running Next.js build..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build completed successfully!"
  exit 0
else
  echo "Build failed!"
  # List the error chunk file if it exists
  if [ -f ".next/server/chunks/8548.js" ]; then
    echo "Error chunk exists, searching for Html references..."
    grep -n "Html" .next/server/chunks/8548.js | head -10
  fi
  exit 1
fi