#!/usr/bin/env python3
"""
Order Details Scraper for OnlineHomeShop.com
Scrapes detailed product information from individual order pages
"""

import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from environment variables
OHS_EMAIL = os.environ.get("OHS_EMAIL")
OHS_PASSWORD = os.environ.get("OHS_PASSWORD")
MONGO_URI = os.environ.get("MONGO_URI")

# Configuration
MONGO_DB_NAME = "ohs"
MONGO_COLLECTION_NAME = "order_details"
SCRAPER_HEADLESS = True
SCRAPER_TIMEOUT = 30
DEBUG = True

def close_klaviyo_modal(driver, wait):
    try:
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

def login_to_ohs(driver, wait):
    """Login to OnlineHomeShop"""
    try:
        # Go to homepage and close modal
        if DEBUG:
            print("Going to OnlineHomeShop homepage...")
        driver.get("https://www.onlinehomeshop.com/")
        close_klaviyo_modal(driver, wait)

        # Go to login page
        if DEBUG:
            print("Navigating to login page...")
        driver.get("https://www.onlinehomeshop.com/customer/account/login/")

        # Login
        email_input = wait.until(EC.element_to_be_clickable((By.ID, "email")))
        password_input = wait.until(EC.element_to_be_clickable((By.ID, "password")))
        
        email_input.clear()
        email_input.send_keys(OHS_EMAIL)
        password_input.clear()
        password_input.send_keys(OHS_PASSWORD)

        # Close cookie banner if present
        try:
            cookie_banner_close = wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#notice-cookie-block button, #notice-cookie-block .action-close"))
            )
            cookie_banner_close.click()
            time.sleep(1)
        except:
            pass

        # Click login button
        login_btn = wait.until(EC.element_to_be_clickable((By.ID, "send2")))
        login_btn.click()

        # Wait for login completion
        wait.until(EC.any_of(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title-wrapper")),
            EC.presence_of_element_located((By.CSS_SELECTOR, ".customer-account-index")),
            EC.url_contains("customer/account")
        ))
        
        if DEBUG:
            print("Login successful!")
        return True
        
    except Exception as e:
        if DEBUG:
            print(f"Login failed: {e}")
        return False

def scrape_order_details(order_id):
    """Scrape detailed product information from a specific order"""
    if not OHS_EMAIL or not OHS_PASSWORD:
        raise ValueError("Missing required environment variables: OHS_EMAIL and/or OHS_PASSWORD")

    if not order_id:
        raise ValueError("Order ID is required")

    options = Options()
    if SCRAPER_HEADLESS:
        options.add_argument("--headless")
    
    # Chrome options for stability
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
        # Login first
        if not login_to_ohs(driver, wait):
            raise Exception("Failed to login to OnlineHomeShop")

        # Navigate to specific order details page
        order_url = f"https://www.onlinehomeshop.com/sales/order/view/order_id/{order_id}/"
        if DEBUG:
            print(f"Navigating to order details: {order_url}")
        
        driver.get(order_url)
        time.sleep(3)

        # Extract order header information
        order_info = {}
        try:
            # Order number - try multiple selectors
            order_number_selectors = [
                ".page-title .order-number",
                "h1 .order-number", 
                ".page-title span",
                "h1",
                ".order-title",
                ".order-number"
            ]
            for selector in order_number_selectors:
                try:
                    order_number_element = driver.find_element(By.CSS_SELECTOR, selector)
                    text = order_number_element.text.strip()
                    if text and text not in ["My Account", "Order", ""]:
                        order_info["order_number"] = text
                        break
                except:
                    continue
            
            if "order_number" not in order_info:
                order_info["order_number"] = f"Order {order_id}"
            
            # Order date - try multiple selectors
            date_selectors = [
                ".order-date",
                ".date",
                "[data-ui-id*='date']",
                ".order-information .date",
                ".order-info .date"
            ]
            for selector in date_selectors:
                try:
                    date_element = driver.find_element(By.CSS_SELECTOR, selector)
                    text = date_element.text.strip()
                    if text and text not in ["Date", ""]:
                        order_info["order_date"] = text
                        break
                except:
                    continue
            
            if "order_date" not in order_info:
                order_info["order_date"] = "N/A"
            
            # Order status - try multiple selectors
            status_selectors = [
                ".order-status",
                ".status",
                "[data-ui-id*='status']",
                ".order-information .status",
                ".order-info .status"
            ]
            for selector in status_selectors:
                try:
                    status_element = driver.find_element(By.CSS_SELECTOR, selector)
                    text = status_element.text.strip()
                    if text and text not in ["Status", ""]:
                        order_info["order_status"] = text
                        break
                except:
                    continue
            
            if "order_status" not in order_info:
                order_info["order_status"] = "N/A"
                
        except Exception as e:
            if DEBUG:
                print(f"Could not extract order header info: {e}")
                
        if DEBUG:
            print(f"Extracted order info: {order_info}")

        # Find the "Items Ordered" tab/section
        try:
            # Try to click on "Items Ordered" tab if it exists
            items_tab = driver.find_element(By.XPATH, "//a[contains(text(), 'Items Ordered')] | //button[contains(text(), 'Items Ordered')]")
            items_tab.click()
            time.sleep(2)
        except:
            if DEBUG:
                print("No 'Items Ordered' tab found, assuming we're already on the right section")

        # Scrape product details from the table
        products = []
        current_page = 1
        
        while True:
            if DEBUG:
                print(f"Scraping page {current_page} of order {order_id}")
            
            # Try different selectors for the products table
            table_selectors = [
                "table.data-table tbody tr",
                ".order-items tbody tr",
                ".items-ordered tbody tr",
                "tbody tr",
                ".product-item"
            ]
            
            rows = []
            for selector in table_selectors:
                try:
                    rows = driver.find_elements(By.CSS_SELECTOR, selector)
                    if rows:
                        # Filter out pagination rows and other non-product rows
                        product_rows = []
                        for row in rows:
                            # Skip rows that contain pagination or are empty
                            row_text = row.text.strip()
                            row_class = row.get_attribute("class") or ""
                            
                            # More comprehensive filtering
                            is_pagination_row = (
                                row.find_elements(By.CSS_SELECTOR, ".order-pager-wrapper") or
                                "order-pager-wrapper" in row_class or
                                "pager" in row_class or
                                not row_text or
                                "Page" in row_text or
                                "Items 1 to" in row_text or
                                "Items " in row_text and " to " in row_text and " total" in row_text or
                                row.get_attribute("data-block") == "order-items-pager-top" or
                                row.get_attribute("data-block") == "order-items-pager-bottom"
                            )
                            
                            if not is_pagination_row:
                                # Additional check: must have some product-like content
                                has_product_content = (
                                    row.find_elements(By.CSS_SELECTOR, "strong, .product-name, .sku, .price") or
                                    any(keyword in row_text.lower() for keyword in ["ordered", "shipped", "sku", "£", "$"])
                                )
                                
                                if has_product_content:
                                    product_rows.append(row)
                        
                        if product_rows:
                            rows = product_rows
                            if DEBUG:
                                print(f"Found {len(rows)} product rows on page {current_page} using selector: {selector}")
                            break
                except:
                    continue
            
            if not rows:
                if current_page == 1:
                    # Save page source for debugging
                    if DEBUG:
                        with open("order_details_debug.html", "w", encoding="utf-8") as f:
                            f.write(driver.page_source)
                        print("Could not find product rows. Page source saved to order_details_debug.html")
                    raise Exception("Could not find product table")
                else:
                    # No more products on this page, we're done
                    break

            # Process products on current page
            page_products = 0
            for i, row in enumerate(rows):
                try:
                    product = {"order_id": order_id}
                    
                    if DEBUG:
                        print(f"Row {i+1} HTML: {row.get_attribute('outerHTML')[:300]}...")
                        print(f"Row {i+1} text: {row.text}")
                    
                    # Product Name (using sitemap selector: strong)
                    try:
                        name_element = row.find_element(By.CSS_SELECTOR, "strong, .product-name, .name")
                        product["product_name"] = name_element.text.strip()
                    except:
                        product["product_name"] = "N/A"
                    
                    # SKU (using sitemap selector: td.sku)
                    try:
                        sku_element = row.find_element(By.CSS_SELECTOR, "td.sku, .sku")
                        product["sku"] = sku_element.text.strip()
                    except:
                        product["sku"] = "N/A"
                    
                    # Price (using sitemap selector: .price span.price)
                    try:
                        price_element = row.find_element(By.CSS_SELECTOR, ".price span.price, .price, .unit-price")
                        product["price"] = price_element.text.strip()
                    except:
                        product["price"] = "N/A"
                    
                    # Quantity (using sitemap selector: ul, but also try other selectors)
                    try:
                        qty_selectors = ["ul", ".qty", ".quantity", "td:contains('Ordered:')"]
                        qty_text = "N/A"
                        for qty_sel in qty_selectors:
                            try:
                                qty_element = row.find_element(By.CSS_SELECTOR, qty_sel)
                                qty_text = qty_element.text.strip()
                                # Extract number from text like "Ordered: 18"
                                if "Ordered:" in qty_text:
                                    qty_text = qty_text.split("Ordered:")[-1].strip()
                                break
                            except:
                                continue
                        product["quantity"] = qty_text
                    except:
                        product["quantity"] = "N/A"
                    
                    # Subtotal (using sitemap selector: .subtotal span.price)
                    try:
                        subtotal_element = row.find_element(By.CSS_SELECTOR, ".subtotal span.price, .subtotal, .line-total")
                        product["subtotal"] = subtotal_element.text.strip()
                    except:
                        product["subtotal"] = "N/A"
                    
                    # Size (using sitemap selector: dd)
                    try:
                        size_element = row.find_element(By.CSS_SELECTOR, "dd, .size")
                        product["size"] = size_element.text.strip()
                    except:
                        product["size"] = "N/A"
                    
                    # Filling (using sitemap selector: dt:contains('Filling') + dd)
                    try:
                        filling_element = row.find_element(By.XPATH, ".//dt[contains(text(), 'Filling')]/following-sibling::dd")
                        product["filling"] = filling_element.text.strip()
                    except:
                        product["filling"] = "N/A"

                    # Only add products that have at least a name
                    if product["product_name"] != "N/A":
                        products.append(product)
                        page_products += 1
                        if DEBUG:
                            print(f"Scraped product {len(products)}: {product['product_name']}")
                    
                except Exception as e:
                    if DEBUG:
                        print(f"Error scraping product {i+1} on page {current_page}: {e}")
                    continue

            if DEBUG:
                print(f"Found {page_products} products on page {current_page}")

            # Check for next page
            try:
                # Look for "Next" button or next page link - using more specific selectors for OnlineHomeShop
                next_selectors = [
                    "li.item.pages-item-next a.action.next",
                    "li.pages-item-next a.action.next", 
                    ".pages-item-next a.action.next",
                    ".pages-item-next a",
                    "a[title='Next']",
                    ".pager .next"
                ]
                
                next_button = None
                for selector in next_selectors:
                    try:
                        potential_buttons = driver.find_elements(By.CSS_SELECTOR, selector)
                        for btn in potential_buttons:
                            if btn and btn.is_enabled() and btn.is_displayed():
                                next_button = btn
                                if DEBUG:
                                    print(f"Found next page button with selector: {selector}")
                                break
                        if next_button:
                            break
                    except:
                        continue
                
                # Also check if there are more numbered page links (as fallback)
                if not next_button:
                    try:
                        # Look for numbered pages greater than current page
                        page_links = driver.find_elements(By.CSS_SELECTOR, ".pages-items li.item a.page")
                        for link in page_links:
                            href = link.get_attribute("href")
                            if href and f"?p={current_page + 1}" in href:
                                next_button = link
                                if DEBUG:
                                    print(f"Found next page link with page number: {current_page + 1}")
                                break
                    except:
                        pass
                
                if next_button and next_button.is_enabled():
                    if DEBUG:
                        next_url = next_button.get_attribute("href")
                        print(f"Navigating to next page: {next_url}")
                    
                    # Scroll to pagination area
                    driver.execute_script("arguments[0].scrollIntoView();", next_button)
                    time.sleep(1)
                    
                    # Click next page
                    driver.execute_script("arguments[0].click();", next_button)  # Use JS click for better reliability
                    time.sleep(5)  # Longer wait for page to load
                    
                    current_page += 1
                    
                    # Verify we actually navigated to a new page
                    current_url = driver.current_url
                    if f"?p={current_page}" not in current_url and current_page > 1:
                        if DEBUG:
                            print(f"Warning: Expected to be on page {current_page} but URL is {current_url}")
                        # Try to continue anyway
                else:
                    if DEBUG:
                        print("No next page button found or not enabled, finishing pagination")
                        
                        # Debug: Print available pagination elements
                        try:
                            pagination_elements = driver.find_elements(By.CSS_SELECTOR, ".pager .pages-items li")
                            print(f"Available pagination elements: {len(pagination_elements)}")
                            for elem in pagination_elements:
                                print(f"  - {elem.get_attribute('class')}: {elem.text.strip()}")
                        except:
                            pass
                    break
                    
            except Exception as e:
                if DEBUG:
                    print(f"Error checking for next page: {e}")
                break

        if DEBUG:
            print(f"Successfully scraped {len(products)} products total from {current_page} page(s) of order {order_id}")

        # Save to MongoDB
        save_order_details_to_mongo(order_id, order_info, products)
        
        return {
            "order_id": order_id,
            "order_info": order_info,
            "products": products,
            "total_products": len(products)
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error during order details scraping: {e}")
        raise e
    finally:
        driver.quit()

def save_order_details_to_mongo(order_id, order_info, products):
    """Save order details to MongoDB"""
    try:
        if DEBUG:
            print(f"Connecting to MongoDB at {MONGO_URI}")
        
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db[MONGO_COLLECTION_NAME]
        
        # Remove existing details for this order
        collection.delete_many({"order_id": order_id})
        
        # Create document to save
        order_details_doc = {
            "order_id": order_id,
            "order_info": order_info,
            "products": products,
            "scraped_at": time.time(),
            "total_products": len(products)
        }
        
        # Insert the new document
        result = collection.insert_one(order_details_doc)
        
        if DEBUG:
            print(f"Saved order details for order {order_id} with {len(products)} products to MongoDB")
        
        client.close()
        return result.inserted_id
        
    except Exception as e:
        if DEBUG:
            print(f"Error saving order details to MongoDB: {e}")
        raise e

def scrape_multiple_order_details(order_ids):
    """Scrape detailed product information from multiple orders with single login"""
    if not OHS_EMAIL or not OHS_PASSWORD:
        raise ValueError("Missing required environment variables: OHS_EMAIL and/or OHS_PASSWORD")

    if not order_ids:
        raise ValueError("Order IDs list is required")

    options = Options()
    if SCRAPER_HEADLESS:
        options.add_argument("--headless")
    
    # Chrome options for stability
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

    results = []
    
    try:
        # Login once at the beginning
        if not login_to_ohs(driver, wait):
            raise Exception("Failed to login to OnlineHomeShop")

        if DEBUG:
            print(f"Successfully logged in. Starting bulk scraping for {len(order_ids)} orders...")

        # Process each order using the same browser session
        for i, order_id in enumerate(order_ids, 1):
            try:
                if DEBUG:
                    print(f"Processing order {i}/{len(order_ids)}: {order_id}")
                
                result = scrape_single_order_details(driver, wait, order_id)
                results.append({
                    "order_id": order_id,
                    "success": True,
                    "total_products": result["total_products"],
                    "order_info": result["order_info"],
                    "products": result["products"]
                })
                
                if DEBUG:
                    print(f"✅ Order {order_id}: {result['total_products']} products scraped")
                
            except Exception as e:
                if DEBUG:
                    print(f"❌ Order {order_id}: Error - {e}")
                
                results.append({
                    "order_id": order_id,
                    "success": False,
                    "error": str(e),
                    "total_products": 0
                })
        
        return results
        
    except Exception as e:
        if DEBUG:
            print(f"Error during bulk order details scraping: {e}")
        raise e
    finally:
        driver.quit()

def scrape_single_order_details(driver, wait, order_id):
    """Scrape detailed product information from a single order using existing browser session"""
    try:
        # Navigate to specific order details page
        order_url = f"https://www.onlinehomeshop.com/sales/order/view/order_id/{order_id}/"
        if DEBUG:
            print(f"Navigating to order details: {order_url}")
        
        driver.get(order_url)
        time.sleep(3)

        # Extract order header information
        order_info = {}
        try:
            # Order number - try multiple selectors
            order_number_selectors = [
                ".page-title .order-number",
                "h1 .order-number", 
                ".page-title span",
                "h1",
                ".order-title",
                ".order-number"
            ]
            for selector in order_number_selectors:
                try:
                    order_number_element = driver.find_element(By.CSS_SELECTOR, selector)
                    text = order_number_element.text.strip()
                    if text and text not in ["My Account", "Order", ""]:
                        order_info["order_number"] = text
                        break
                except:
                    continue
            
            if "order_number" not in order_info:
                order_info["order_number"] = f"Order {order_id}"
            
            # Order date - try multiple selectors
            date_selectors = [
                ".order-date",
                ".date",
                "[data-ui-id*='date']",
                ".order-information .date",
                ".order-info .date"
            ]
            for selector in date_selectors:
                try:
                    date_element = driver.find_element(By.CSS_SELECTOR, selector)
                    text = date_element.text.strip()
                    if text and text not in ["Date", ""]:
                        order_info["order_date"] = text
                        break
                except:
                    continue
            
            if "order_date" not in order_info:
                order_info["order_date"] = "N/A"
            
            # Order status - try multiple selectors
            status_selectors = [
                ".order-status",
                ".status",
                "[data-ui-id*='status']",
                ".order-information .status",
                ".order-info .status"
            ]
            for selector in status_selectors:
                try:
                    status_element = driver.find_element(By.CSS_SELECTOR, selector)
                    text = status_element.text.strip()
                    if text and text not in ["Status", ""]:
                        order_info["order_status"] = text
                        break
                except:
                    continue
            
            if "order_status" not in order_info:
                order_info["order_status"] = "N/A"
                
        except Exception as e:
            if DEBUG:
                print(f"Could not extract order header info: {e}")
                
        if DEBUG:
            print(f"Extracted order info: {order_info}")

        # Find the "Items Ordered" tab/section
        try:
            # Try to click on "Items Ordered" tab if it exists
            items_tab = driver.find_element(By.XPATH, "//a[contains(text(), 'Items Ordered')] | //button[contains(text(), 'Items Ordered')]")
            items_tab.click()
            time.sleep(2)
        except:
            if DEBUG:
                print("No 'Items Ordered' tab found, assuming we're already on the right section")

        # Scrape product details from the table
        products = []
        current_page = 1
        
        while True:
            if DEBUG:
                print(f"Scraping page {current_page} of order {order_id}")
            
            # Try different selectors for the products table
            table_selectors = [
                "table.data-table tbody tr",
                ".order-items tbody tr",
                ".items-ordered tbody tr",
                "tbody tr",
                ".product-item"
            ]
            
            rows = []
            for selector in table_selectors:
                try:
                    rows = driver.find_elements(By.CSS_SELECTOR, selector)
                    if rows:
                        # Filter out pagination rows and other non-product rows
                        product_rows = []
                        for row in rows:
                            # Skip rows that contain pagination or are empty
                            row_text = row.text.strip()
                            row_class = row.get_attribute("class") or ""
                            
                            # More comprehensive filtering
                            is_pagination_row = (
                                row.find_elements(By.CSS_SELECTOR, ".order-pager-wrapper") or
                                "order-pager-wrapper" in row_class or
                                "pager" in row_class or
                                not row_text or
                                "Page" in row_text or
                                "Items 1 to" in row_text or
                                "Items " in row_text and " to " in row_text and " total" in row_text or
                                row.get_attribute("data-block") == "order-items-pager-top" or
                                row.get_attribute("data-block") == "order-items-pager-bottom"
                            )
                            
                            if not is_pagination_row:
                                # Additional check: must have some product-like content
                                has_product_content = (
                                    row.find_elements(By.CSS_SELECTOR, "strong, .product-name, .sku, .price") or
                                    any(keyword in row_text.lower() for keyword in ["ordered", "shipped", "sku", "£", "$"])
                                )
                                
                                if has_product_content:
                                    product_rows.append(row)
                        
                        if product_rows:
                            rows = product_rows
                            if DEBUG:
                                print(f"Found {len(rows)} product rows on page {current_page} using selector: {selector}")
                            break
                except:
                    continue
            
            if not rows:
                if current_page == 1:
                    # Save page source for debugging
                    if DEBUG:
                        with open(f"order_details_debug_{order_id}.html", "w", encoding="utf-8") as f:
                            f.write(driver.page_source)
                        print(f"Could not find product rows for order {order_id}. Page source saved to order_details_debug_{order_id}.html")
                    # Don't raise exception for bulk processing, just return empty result
                    break
                else:
                    # No more products on this page, we're done
                    break

            # Process products on current page
            page_products = 0
            for i, row in enumerate(rows):
                try:
                    product = {"order_id": order_id}
                    
                    if DEBUG:
                        print(f"Row {i+1} HTML: {row.get_attribute('outerHTML')[:300]}...")
                        print(f"Row {i+1} text: {row.text}")
                    
                    # Product Name (using sitemap selector: strong)
                    try:
                        name_element = row.find_element(By.CSS_SELECTOR, "strong, .product-name, .name")
                        product["product_name"] = name_element.text.strip()
                    except:
                        product["product_name"] = "N/A"
                    
                    # SKU (using sitemap selector: td.sku)
                    try:
                        sku_element = row.find_element(By.CSS_SELECTOR, "td.sku, .sku")
                        product["sku"] = sku_element.text.strip()
                    except:
                        product["sku"] = "N/A"
                    
                    # Price (using sitemap selector: .price span.price)
                    try:
                        price_element = row.find_element(By.CSS_SELECTOR, ".price span.price, .price, .unit-price")
                        product["price"] = price_element.text.strip()
                    except:
                        product["price"] = "N/A"
                    
                    # Quantity (using sitemap selector: ul, but also try other selectors)
                    try:
                        qty_selectors = ["ul", ".qty", ".quantity", "td:contains('Ordered:')"]
                        qty_text = "N/A"
                        for qty_sel in qty_selectors:
                            try:
                                qty_element = row.find_element(By.CSS_SELECTOR, qty_sel)
                                qty_text = qty_element.text.strip()
                                # Extract number from text like "Ordered: 18"
                                if "Ordered:" in qty_text:
                                    qty_text = qty_text.split("Ordered:")[-1].strip()
                                break
                            except:
                                continue
                        product["quantity"] = qty_text
                    except:
                        product["quantity"] = "N/A"
                    
                    # Subtotal (using sitemap selector: .subtotal span.price)
                    try:
                        subtotal_element = row.find_element(By.CSS_SELECTOR, ".subtotal span.price, .subtotal, .line-total")
                        product["subtotal"] = subtotal_element.text.strip()
                    except:
                        product["subtotal"] = "N/A"
                    
                    # Size (using sitemap selector: dd)
                    try:
                        size_element = row.find_element(By.CSS_SELECTOR, "dd, .size")
                        product["size"] = size_element.text.strip()
                    except:
                        product["size"] = "N/A"
                    
                    # Filling (using sitemap selector: dt:contains('Filling') + dd)
                    try:
                        filling_element = row.find_element(By.XPATH, ".//dt[contains(text(), 'Filling')]/following-sibling::dd")
                        product["filling"] = filling_element.text.strip()
                    except:
                        product["filling"] = "N/A"

                    # Only add products that have at least a name
                    if product["product_name"] != "N/A":
                        products.append(product)
                        page_products += 1
                        if DEBUG:
                            print(f"Scraped product {len(products)}: {product['product_name']}")
                    
                except Exception as e:
                    if DEBUG:
                        print(f"Error scraping product {i+1} on page {current_page}: {e}")
                    continue

            if DEBUG:
                print(f"Found {page_products} products on page {current_page}")

            # Check for next page (simplified for bulk processing)
            try:
                next_button = driver.find_element(By.CSS_SELECTOR, "li.item.pages-item-next a.action.next")
                if next_button and next_button.is_enabled():
                    driver.execute_script("arguments[0].click();", next_button)
                    time.sleep(3)
                    current_page += 1
                else:
                    break
            except:
                break

        if DEBUG:
            print(f"Successfully scraped {len(products)} products total from {current_page} page(s) of order {order_id}")

        # Save to MongoDB
        save_order_details_to_mongo(order_id, order_info, products)
        
        return {
            "order_id": order_id,
            "order_info": order_info,
            "products": products,
            "total_products": len(products)
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error during order details scraping for {order_id}: {e}")
        raise e

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python order_details_scraper.py <order_id>")
        sys.exit(1)
    
    order_id = sys.argv[1]
    
    try:
        result = scrape_order_details(order_id)
        print(f"✅ Order details scraping completed!")
        print(f"📊 Order ID: {result['order_id']}")
        print(f"📦 Products found: {result['total_products']}")
        
        for i, product in enumerate(result['products'][:3], 1):  # Show first 3 products
            print(f"  {i}. {product['product_name']} (SKU: {product['sku']})")
            print(f"     Price: {product['price']} | Qty: {product['quantity']} | Subtotal: {product['subtotal']}")
            
    except Exception as e:
        print(f"❌ Order details scraping failed: {e}")
        sys.exit(1) 