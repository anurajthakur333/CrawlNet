import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def close_popups(driver, wait, max_attempts=3):
    for _ in range(max_attempts):
        closed_any = False
        # Try to close modal dialog
        try:
            modal_close = WebDriverWait(driver, 2).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Close') or contains(@aria-label, 'close') or contains(@class, 'close')]"))
            )
            modal_close.click()
            print("Closed modal dialog.")
            closed_any = True
            time.sleep(1)
        except Exception:
            pass
        # Try to close cookie popup
        try:
            cookie_close = WebDriverWait(driver, 2).until(
                EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Close']"))
            )
            cookie_close.click()
            print("Closed cookie popup.")
            closed_any = True
            time.sleep(1)
        except Exception:
            pass
        if not closed_any:
            break

def scrape_orders():
    # Get credentials from environment variables
    EMAIL = os.environ.get("OHS_EMAIL")
    PASSWORD = os.environ.get("OHS_PASSWORD")

    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Chrome(options=options)

    # Go to login page
    driver.get("https://www.onlinehomeshop.com/customer/account/login/")
    wait = WebDriverWait(driver, 20)

    # Loop to close any popups/modals
    close_popups(driver, wait, max_attempts=5)

    # Now wait for login fields to be visible and interactable
    try:
        email_input = wait.until(EC.element_to_be_clickable((By.ID, "email")))
        password_input = wait.until(EC.element_to_be_clickable((By.ID, "pass")))
        print("Login form found, logging in...")
        email_input.clear()
        email_input.send_keys(EMAIL)
        password_input.clear()
        password_input.send_keys(PASSWORD)
        password_input.send_keys(Keys.RETURN)
        # Wait for login to complete
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".page-title-wrapper")))
    except Exception as e:
        print("Login form not found or not interactable:", e)

    # Go to order history page
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
    return orders

if __name__ == "__main__":
    print(scrape_orders()) 