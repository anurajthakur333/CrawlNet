#!/bin/bash
# Backend Setup Script for CrawlNet

echo "🌐 CrawlNet Backend Setup"
echo "========================="

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Remove existing virtual environment if it exists
if [ -d "venv" ]; then
    echo "🗑️  Removing existing virtual environment..."
    rm -rf venv
fi

# Create new virtual environment
echo "📦 Creating new virtual environment..."
python3 -m venv venv

# Check if virtual environment was created successfully
if [ ! -d "venv" ]; then
    echo "❌ Failed to create virtual environment."
    exit 1
fi

# Activate virtual environment and install dependencies
echo "📥 Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Backend setup completed successfully!"
    echo ""
    echo "To start the server:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  python start_server.py"
    echo ""
    echo "Or use the quick start:"
    echo "  cd backend && source venv/bin/activate && python start_server.py"
else
    echo "❌ Failed to install dependencies."
    exit 1
fi 