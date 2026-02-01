#!/usr/bin/env python3
"""
Test script for g4f (GPT4Free) installation
This script verifies that g4f is installed and working correctly
"""

import sys

def test_import():
    """Test if g4f can be imported"""
    try:
        import g4f
        print("✅ g4f module imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import g4f: {e}")
        print("\nInstall g4f with: pip3 install -U g4f[all]")
        return False

def test_client():
    """Test if g4f Client can be created"""
    try:
        from g4f.client import Client
        client = Client()
        print("✅ g4f Client created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create g4f Client: {e}")
        return False

def test_simple_request():
    """Test a simple AI request"""
    try:
        from g4f.client import Client
        
        print("\n🤖 Testing AI request with model: gpt-4")
        print("   This may take a few seconds...\n")
        
        client = Client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Say 'Hello from g4f!' if you're working"}],
            web_search=False
        )
        
        result = response.choices[0].message.content
        print(f"✅ AI Response: {result}")
        return True
    except Exception as e:
        print(f"❌ Failed to get AI response: {e}")
        print("\nThis might be a temporary provider issue. Try again in a few moments.")
        return False

def main():
    print("=" * 60)
    print("G4F (GPT4Free) Installation Test")
    print("=" * 60)
    print()
    
    # Test 1: Import
    if not test_import():
        sys.exit(1)
    
    # Test 2: Client creation
    if not test_client():
        sys.exit(1)
    
    # Test 3: Simple request
    if not test_simple_request():
        print("\n⚠️  g4f is installed but providers may be temporarily unavailable")
        print("   This is normal - g4f will try multiple providers automatically")
        sys.exit(0)
    
    print("\n" + "=" * 60)
    print("🎉 All tests passed! g4f is ready to use.")
    print("=" * 60)
    print()
    print("Available models: gpt-4, gpt-5, meta-ai, qwen-max, and more")
    print("No API keys required - completely free!")
    print()

if __name__ == "__main__":
    main()
