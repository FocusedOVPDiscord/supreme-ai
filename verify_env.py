import sys
import os
import subprocess

def check():
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path}")
    
    try:
        import g4f
        print(f"✅ g4f found: {g4f.__file__}")
        print(f"g4f version: {g4f.version.get_version() if hasattr(g4f, 'version') else 'unknown'}")
    except ImportError as e:
        print(f"❌ g4f NOT found: {e}")
        
        # Try to find where it might be
        print("\nSearching for g4f in site-packages...")
        for path in sys.path:
            if os.path.exists(os.path.join(path, 'g4f')):
                print(f"Found g4f directory in: {path}")

if __name__ == "__main__":
    check()
