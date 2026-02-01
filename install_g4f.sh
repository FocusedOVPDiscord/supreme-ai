#!/bin/bash

# Installation script for g4f (GPT4Free)
# This script installs g4f Python library for completely free AI access

echo "🚀 Installing g4f (GPT4Free) - Free AI without API keys or rate limits"
echo ""

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.10+ first."
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"
echo ""

# Check if pip3 is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"
echo ""

# Install g4f with all dependencies
echo "📦 Installing g4f[all]..."
pip3 install -U g4f[all]

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ g4f installed successfully!"
    echo ""
    echo "🎉 Your bot now has access to:"
    echo "   - GPT-4, GPT-5 (completely free)"
    echo "   - Meta AI, Qwen, Claude models"
    echo "   - No API keys required"
    echo "   - No rate limits"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Remove GROQ_API_KEY from your .env file (no longer needed)"
    echo "   2. Start your bot: npm start"
    echo ""
else
    echo ""
    echo "❌ Failed to install g4f"
    echo "Please try manually: pip3 install -U g4f[all]"
    exit 1
fi
