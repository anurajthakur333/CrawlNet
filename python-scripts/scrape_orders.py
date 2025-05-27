import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pymongo import MongoClient

def close_klaviyo_modal(driver, wait):
    try:
        # Wait for the modal close button to be clickable
        close_btn = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.klaviyo-close-form[aria-label='Close dialog']"))
        )
        close_btn.click()
        print("Closed Klaviyo modal.")
        time.sleep(1)
    except Exception as e:
        print("No Klaviyo modal or could not close it.", e)

def scrape_orders():
    EMAIL = os.environ.get("OHS_EMAIL")
    PASSWORD = os.environ.get("OHS_PASSWORD")

    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 20)

    # 1. Go to homepage and close modal
    driver.get("https://www.onlinehomeshop.com/")
    close_klaviyo_modal(driver, wait)

    # 2. Go to login page
    driver.get("https://www.onlinehomeshop.com/customer/account/login/")

    # Wait for login form fields
    try:
        email_input = wait.until(EC.element_to_be_clickable((By.ID, "email")))
        password_input = wait.until(EC.element_to_be_clickable((By.ID, "password")))
        print("Login form found, logging in...")
        email_input.clear()
        email_input.send_keys(EMAIL)
        password_input.clear()
        password_input.send_keys(PASSWORD)
        # Try to close the cookie consent banner if present
        try:
            cookie_banner_close = wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#notice-cookie-block button, #notice-cookie-block .action-close, #notice-cookie-block [aria-label='Close']"))
            )
            cookie_banner_close.click()
            print("Closed cookie consent banner.")
            time.sleep(1)
        except Exception as e:
            print("No cookie consent banner or could not close it.", e)
        # Click the login button
        login_btn = wait.until(EC.element_to_be_clickable((By.ID, "send2")))
        login_btn.click()
        # Wait for login to complete (look for account page or redirect)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title-wrapper")))
    except Exception as e:
        print("Login form not found or not interactable:", e)
        driver.quit()
        return []

    # 3. Go to order history page
    driver.get("https://www.onlinehomeshop.com/sales/order/history/")
    try:
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#my-orders-table tbody tr")))
    except Exception as e:
        print("Could not find orders table:", e)
        driver.quit()
        return []

    orders = []
    rows = driver.find_elements(By.CSS_SELECTOR, "#my-orders-table tbody tr")
    for row in rows:
        order = {
            "order_number": row.find_element(By.CSS_SELECTOR, "td.col.id").text,
            "date": row.find_element(By.CSS_SELECTOR, "td.col.date").text,
            "total": row.find_element(By.CSS_SELECTOR, "td.col.total").text,
            "status": row.find_element(By.CSS_SELECTOR, "td.col.status").text,
            "view_link": row.find_element(By.CSS_SELECTOR, "td.col.actions a.action.view").get_attribute("href"),
        }
        orders.append(order)

    driver.quit()
    save_orders_to_mongo(orders)
    return orders

def save_orders_to_mongo(orders):
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["ohs"]  # database name
    collection = db["orders"]  # collection name
    # Remove old orders for this user (optional, or you can upsert)
    collection.delete_many({})  # Remove this line if you want to keep history
    if orders:
        collection.insert_many(orders)
    client.close()

if __name__ == "__main__":
    print(scrape_orders())