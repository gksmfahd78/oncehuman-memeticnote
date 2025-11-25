#!/bin/bash
echo "Cleaning cache and dist..."
rm -rf dist
rm -rf node_modules/.vite
echo "Building..."
npm run build
echo "Done! Please restart server with: pm2 restart all"
