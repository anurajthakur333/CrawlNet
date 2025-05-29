#!/usr/bin/env python3
"""
Status check script for CrawlNet backend
"""

import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()

def check_environment():
    """Check if all required environment variables are set"""
    print("🔧 Environment Variables Check")
    print("==============================")
    
    required_vars = ["CORS_ORIGINS", "MONGO_URI", "OHS_EMAIL", "OHS_PASSWORD"]
    optional_vars = ["API_HOST", "API_PORT", "DEBUG"]
    
    all_good = True
    
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            if var in ["OHS_EMAIL", "OHS_PASSWORD"]:
                # Mask sensitive info
                if var == "OHS_EMAIL" and "@" in value:
                    masked = f"{value[:3]}***@{value.split('@')[1]}"
                else:
                    masked = "*" * len(value)
                print(f"✅ {var}: {masked}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: NOT SET")
            all_good = False
    
    print("\nOptional variables:")
    for var in optional_vars:
        value = os.environ.get(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: Not set (using defaults)")
    
    return all_good

def check_mongodb():
    """Check MongoDB connection"""
    print("\n🍃 MongoDB Connection Check")
    print("============================")
    
    mongo_uri = os.environ.get("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI not set")
        return False
    
    try:
        client = MongoClient(mongo_uri)
        # Test connection
        client.admin.command('ping')
        
        # Check database and collection
        db = client["ohs"]
        collection = db["orders"]
        count = collection.count_documents({})
        
        print(f"✅ MongoDB connection successful")
        print(f"✅ Database 'ohs' accessible")
        print(f"✅ Collection 'orders' has {count} documents")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def check_dependencies():
    """Check if all required Python packages are installed"""
    print("\n📦 Dependencies Check")
    print("=====================")
    
    required_packages = [
        ("selenium", "Selenium WebDriver"),
        ("pymongo", "MongoDB driver"),
        ("fastapi", "FastAPI framework"),
        ("uvicorn", "ASGI server"),
        ("dotenv", "Environment variables")
    ]
    
    all_good = True
    
    for package, description in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"✅ {package}: {description}")
        except ImportError:
            print(f"❌ {package}: NOT INSTALLED - {description}")
            all_good = False
    
    return all_good

def main():
    print("🌐 CrawlNet Backend Status Check")
    print("=================================\n")
    
    env_ok = check_environment()
    deps_ok = check_dependencies()
    mongo_ok = check_mongodb()
    
    print("\n📊 Summary")
    print("==========")
    
    if env_ok:
        print("✅ Environment variables: OK")
    else:
        print("❌ Environment variables: MISSING REQUIRED VARS")
    
    if deps_ok:
        print("✅ Dependencies: OK")
    else:
        print("❌ Dependencies: MISSING PACKAGES")
    
    if mongo_ok:
        print("✅ MongoDB: OK")
    else:
        print("❌ MongoDB: CONNECTION FAILED")
    
    if env_ok and deps_ok and mongo_ok:
        print("\n🎉 All systems ready! You can start the server with:")
        print("   python start_server.py")
        return True
    else:
        print("\n⚠️  Some issues detected. Please fix them before starting the server.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 