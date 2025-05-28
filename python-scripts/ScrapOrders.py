import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from environment variables (simplified)
OHS_EMAIL = os.environ.get("OHS_EMAIL")
OHS_PASSWORD = os.environ.get("OHS_PASSWORD")
MONGO_URI = os.environ.get("MONGO_URI")

# Hardcoded configuration
MONGO_DB_NAME = "ohs"
MONGO_COLLECTION_NAME = "orders"
SCRAPER_HEADLESS = True
SCRAPER_TIMEOUT = 20
DEBUG = True

def close_klaviyo_modal(driver, wait):
    try:
        # Wait for the modal close button to be clickable
        close_btn = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.klaviyo-close-form[aria-label='Close dialog']"))
        )
        close_btn.click()
        if DEBUG:
            print("Closed Klaviyo modal.")
        time.sleep(1)
    except Exception as e:
        if DEBUG:
            print("No Klaviyo modal or could not close it.", e)

def scrape_orders():
    # Validate required environment variables
    if not OHS_EMAIL or not OHS_PASSWORD:
        error_msg = "Missing required environment variables: OHS_EMAIL and/or OHS_PASSWORD"
        if DEBUG:
            print(error_msg)
        raise ValueError(error_msg)

    options = Options()
    if SCRAPER_HEADLESS:
        options.add_argument("--headless")
    
    # Additional Chrome options for better performance and stability
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, SCRAPER_TIMEOUT)

    try:
        # 1. Go to homepage and close modal
        if DEBUG:
            print("Going to OnlineHomeShop homepage...")
        driver.get("https://www.onlinehomeshop.com/")
        close_klaviyo_modal(driver, wait)

        # 2. Go to login page
        if DEBUG:
            print("Navigating to login page...")
        driver.get("https://www.onlinehomeshop.com/customer/account/login/")

        # Wait for login form fields
        try:
            email_input = wait.until(EC.element_to_be_clickable((By.ID, "email")))
            password_input = wait.until(EC.element_to_be_clickable((By.ID, "password")))
            if DEBUG:
                print("Login form found, logging in...")
            email_input.clear()
            email_input.send_keys(OHS_EMAIL)
            password_input.clear()
            password_input.send_keys(OHS_PASSWORD)
            
            # Try to close the cookie consent banner if present
            try:
                cookie_banner_close = wait.until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "#notice-cookie-block button, #notice-cookie-block .action-close, #notice-cookie-block [aria-label='Close']"))
                )
                cookie_banner_close.click()
                if DEBUG:
                    print("Closed cookie consent banner.")
                time.sleep(1)
            except Exception as e:
                if DEBUG:
                    print("No cookie consent banner or could not close it.", e)
            
            # Click the login button
            login_btn = wait.until(EC.element_to_be_clickable((By.ID, "send2")))
            login_btn.click()
            
            # Wait for login to complete (look for account page or redirect)
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title-wrapper")))
            if DEBUG:
                print("Login successful!")
        except Exception as e:
            error_msg = f"Login form not found or not interactable: {e}"
            if DEBUG:
                print(error_msg)
            raise Exception(error_msg)

        # 3. Go to order history page
        if DEBUG:
            print("Navigating to order history...")
        driver.get("https://www.onlinehomeshop.com/sales/order/history/")
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#my-orders-table tbody tr")))
        except Exception as e:
            error_msg = f"Could not find orders table: {e}"
            if DEBUG:
                print(error_msg)
            raise Exception(error_msg)

        # Scrape orders
        orders = []
        rows = driver.find_elements(By.CSS_SELECTOR, "#my-orders-table tbody tr")
        if DEBUG:
            print(f"Found {len(rows)} orders to scrape...")
            
        for i, row in enumerate(rows):
            try:
                order = {
                    "order_number": row.find_element(By.CSS_SELECTOR, "td.col.id").text,
                    "date": row.find_element(By.CSS_SELECTOR, "td.col.date").text,
                    "total": row.find_element(By.CSS_SELECTOR, "td.col.total").text,
                    "status": row.find_element(By.CSS_SELECTOR, "td.col.status").text,
                    "view_link": row.find_element(By.CSS_SELECTOR, "td.col.actions a.action.view").get_attribute("href"),
                }
                orders.append(order)
                if DEBUG:
                    print(f"Scraped order {i+1}: {order['order_number']}")
            except Exception as e:
                if DEBUG:
                    print(f"Error scraping order {i+1}: {e}")
                continue

        if DEBUG:
            print(f"Successfully scraped {len(orders)} orders")
        
        # Save to MongoDB
        save_orders_to_mongo(orders)
        return orders
        
    except Exception as e:
        if DEBUG:
            print(f"Error during scraping: {e}")
        raise e
    finally:
        driver.quit()

def save_orders_to_mongo(orders):
    try:
        if DEBUG:
            print(f"Connecting to MongoDB at {MONGO_URI}")
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db[MONGO_COLLECTION_NAME]
        
        # Remove old orders for this user (optional, or you can upsert)
        old_count = collection.count_documents({})
        collection.delete_many({})  # Remove this line if you want to keep history
        
        if orders:
            collection.insert_many(orders)
            if DEBUG:
                print(f"Saved {len(orders)} orders to MongoDB (replaced {old_count} old orders)")
        else:
            if DEBUG:
                print("No orders to save")
        
        client.close()
    except Exception as e:
        if DEBUG:
            print(f"Error saving to MongoDB: {e}")
        raise e

if __name__ == "__main__":
    try:
        orders = scrape_orders()
        print(f"Scraping completed successfully! Found {len(orders)} orders.")
        for order in orders:
            print(f"- Order {order['order_number']}: {order['status']} ({order['total']})")
    except Exception as e:
        print(f"Scraping failed: {e}")
        exit(1)