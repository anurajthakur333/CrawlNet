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
SCRAPER_TIMEOUT = 30  # Increased timeout
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
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    driver = webdriver.Chrome(options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
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
            
            # Check for CAPTCHA or verification challenges
            captcha_elements = driver.find_elements(By.CSS_SELECTOR, ".captcha, .recaptcha, [data-captcha], .verification")
            if captcha_elements:
                error_msg = "CAPTCHA or verification challenge detected. Manual intervention required."
                if DEBUG:
                    print(error_msg)
                    # Save page for debugging
                    with open("captcha_page_source.html", "w", encoding="utf-8") as f:
                        f.write(driver.page_source)
                    print("Saved CAPTCHA page to captcha_page_source.html")
                raise Exception(error_msg)
            
            # Click the login button
            login_btn = wait.until(EC.element_to_be_clickable((By.ID, "send2")))
            login_btn.click()
            
            # Wait for login to complete - try multiple indicators
            if DEBUG:
                print("Waiting for login to complete...")
            
            try:
                # Wait for redirect to account dashboard or orders page
                wait.until(EC.any_of(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title-wrapper")),
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".customer-account-index")),
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".account-nav")),
                    EC.url_contains("customer/account")
                ))
                if DEBUG:
                    print("Login successful!")
                    
                # Double-check we're actually logged in by looking for login-specific elements
                logged_in_indicators = driver.find_elements(By.CSS_SELECTOR, ".logged-in, .customer-welcome, .account-nav, [data-bind*='customer']")
                if not logged_in_indicators:
                    # Check if we're still on login page
                    if "login" in driver.current_url.lower():
                        # Check for login error messages
                        error_elements = driver.find_elements(By.CSS_SELECTOR, ".message-error, .error-msg, .field-error")
                        if error_elements:
                            error_text = error_elements[0].text
                            if DEBUG:
                                print(f"Login error detected: {error_text}")
                            raise Exception(f"Login failed: {error_text}")
                        else:
                            raise Exception("Login appears to have failed - still on login page")
                            
            except Exception as login_e:
                if DEBUG:
                    print(f"Login completion check failed: {login_e}")
                    print(f"Current URL: {driver.current_url}")
                    print(f"Page title: {driver.title}")
                    
                    # Save page for debugging login issues
                    with open("login_debug_page_source.html", "w", encoding="utf-8") as f:
                        f.write(driver.page_source)
                    print("Saved login debug page to login_debug_page_source.html")
                    
                # Check if this looks like a login error
                if "login" in driver.current_url.lower():
                    raise Exception("Login failed - credentials may be incorrect or account may be locked")
                else:
                    # Continue anyway, maybe login worked but indicators are different
                    if DEBUG:
                        print("Continuing despite login check failure...")
                
        except Exception as e:
            error_msg = f"Login form not found or not interactable: {e}"
            if DEBUG:
                print(error_msg)
                print(f"Current URL: {driver.current_url}")
                print(f"Page title: {driver.title}")
            raise Exception(error_msg)

        # 3. Go to order history page
        if DEBUG:
            print("Navigating to order history...")
        driver.get("https://www.onlinehomeshop.com/sales/order/history/")
        
        # Wait a bit for page to load
        time.sleep(3)
        
        if DEBUG:
            print(f"Order history page URL: {driver.current_url}")
            print(f"Page title: {driver.title}")
        
        try:
            # Try different possible selectors for the orders table
            orders_found = False
            
            # Try main selector first
            try:
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#my-orders-table tbody tr")))
                orders_found = True
                if DEBUG:
                    print("Found orders table with primary selector")
            except:
                pass
            
            # Try alternative selectors
            if not orders_found:
                alternative_selectors = [
                    "table.data-table tbody tr",
                    ".order-history-table tbody tr",
                    ".orders-table tbody tr",
                    "table tbody tr",
                    ".order-item",
                    ".order-row"
                ]
                
                for selector in alternative_selectors:
                    try:
                        elements = driver.find_elements(By.CSS_SELECTOR, selector)
                        if elements:
                            orders_found = True
                            if DEBUG:
                                print(f"Found orders with alternative selector: {selector}")
                            break
                    except:
                        continue
            
            if not orders_found:
                # Check if there's a "no orders" message
                no_orders_selectors = [
                    ".message.info",
                    ".no-orders",
                    ".empty-orders",
                    "[data-bind*='no orders']"
                ]
                
                no_orders_found = False
                for selector in no_orders_selectors:
                    try:
                        element = driver.find_element(By.CSS_SELECTOR, selector)
                        if "no order" in element.text.lower():
                            no_orders_found = True
                            if DEBUG:
                                print(f"Found 'no orders' message: {element.text}")
                            break
                    except:
                        continue
                
                if no_orders_found:
                    if DEBUG:
                        print("No orders found for this account")
                    return []  # Return empty list instead of error
                else:
                    # Save page source for debugging
                    if DEBUG:
                        print("Could not find orders table. Saving page source...")
                        with open("debug_page_source.html", "w", encoding="utf-8") as f:
                            f.write(driver.page_source)
                        print("Page source saved to debug_page_source.html")
                    
                    raise Exception("Could not find orders table on the page")
                    
        except Exception as e:
            error_msg = f"Could not find orders table: {e}"
            if DEBUG:
                print(error_msg)
                print(f"Current URL: {driver.current_url}")
                print(f"Page title: {driver.title}")
            raise Exception(error_msg)

        # Scrape orders
        orders = []
        rows = driver.find_elements(By.CSS_SELECTOR, "#my-orders-table tbody tr")
        if DEBUG:
            print(f"Found {len(rows)} orders to scrape...")
            
        for i, row in enumerate(rows):
            try:
                # Get the view link first
                view_link_element = row.find_element(By.CSS_SELECTOR, "td.col.actions a.action.view")
                view_link = view_link_element.get_attribute("href")
                
                # Extract order_id from the view_link URL
                # URL format: https://www.onlinehomeshop.com/sales/order/view/order_id/3984163/
                order_id = None
                if view_link and "/order_id/" in view_link:
                    try:
                        # Split by /order_id/ and get the next part, then remove trailing /
                        order_id_part = view_link.split("/order_id/")[1]
                        order_id = order_id_part.split("/")[0]  # Get just the ID, remove trailing slash
                    except (IndexError, AttributeError):
                        order_id = None
                
                order = {
                    "order_number": row.find_element(By.CSS_SELECTOR, "td.col.id").text,
                    "date": row.find_element(By.CSS_SELECTOR, "td.col.date").text,
                    "total": row.find_element(By.CSS_SELECTOR, "td.col.total").text,
                    "status": row.find_element(By.CSS_SELECTOR, "td.col.status").text,
                    "view_link": view_link,
                    "order_id": order_id  # Add the extracted order_id
                }
                orders.append(order)
                
                if DEBUG:
                    print(f"Scraped order {i+1}: {order['order_number']}")
                    print(f"  View URL: {view_link}")
                    print(f"  Order ID: {order_id}")
                    
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