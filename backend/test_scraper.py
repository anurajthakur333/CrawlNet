#!/usr/bin/env python3
"""
Test script for debugging the OnlineHomeShop scraper
"""

import os
import sys
from dotenv import load_dotenv
from scraper import scrape_orders

# Load environment variables
load_dotenv()

def test_scraper():
    print("🌐 CrawlNet Scraper Test")
    print("========================")
    
    # Check environment variables
    ohs_email = os.environ.get("OHS_EMAIL")
    ohs_password = os.environ.get("OHS_PASSWORD")
    mongo_uri = os.environ.get("MONGO_URI")
    
    if not ohs_email:
        print("❌ OHS_EMAIL environment variable not set")
        return False
    
    if not ohs_password:
        print("❌ OHS_PASSWORD environment variable not set")
        return False
    
    if not mongo_uri:
        print("❌ MONGO_URI environment variable not set")
        return False
    
    print(f"✅ OHS Email: {ohs_email[:3]}***@{ohs_email.split('@')[1] if '@' in ohs_email else 'unknown'}")
    print(f"✅ OHS Password: {'*' * len(ohs_password)}")
    print(f"✅ MongoDB URI: {mongo_uri[:20]}...")
    print()
    
    try:
        print("🚀 Starting scraper test...")
        orders = scrape_orders()
        
        if orders is None:
            print("❌ Scraper returned None")
            return False
        
        if not isinstance(orders, list):
            print(f"❌ Scraper returned {type(orders)}, expected list")
            return False
        
        print(f"✅ Scraper completed successfully!")
        print(f"📊 Found {len(orders)} orders")
        
        if orders:
            print("\n📋 Sample orders:")
            for i, order in enumerate(orders[:3]):  # Show first 3 orders
                print(f"  {i+1}. Order #{order.get('order_number', 'N/A')}")
                print(f"     Date: {order.get('date', 'N/A')}")
                print(f"     Status: {order.get('status', 'N/A')}")
                print(f"     Total: {order.get('total', 'N/A')}")
                print()
        else:
            print("ℹ️  No orders found (this might be normal if the account has no orders)")
        
        return True
        
    except Exception as e:
        print(f"❌ Scraper failed with error: {e}")
        print(f"   Error type: {type(e).__name__}")
        
        # Check if debug files were created
        debug_file = "debug_page_source.html"
        if os.path.exists(debug_file):
            print(f"🔍 Debug file created: {debug_file}")
            print("   You can open this file in a browser to see what the scraper saw")
        
        return False

def main():
    success = test_scraper()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 