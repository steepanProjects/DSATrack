#!/bin/bash

# Build script for production deployment
echo "Building DSA Progress Tracker for production..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building frontend and backend..."
npm run build

# Push database schema (only if needed)
if [ "$1" = "--with-db" ]; then
  echo "Pushing database schema..."
  npm run db:push
fi

echo "Build completed successfully!"
echo "Ready for deployment on Render."