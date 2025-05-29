#!/usr/bin/env python3
"""
Advanced Product Details Scraper for OnlineHomeShop.com
Enhanced with job queuing, real-time progress, and improved reliability
"""

import os
import time
import json
import csv
import re
import uuid
from datetime import datetime
from urllib.parse import urljoin
from typing import List, Dict, Any, Optional
import threading
import queue

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager

from bs4 import BeautifulSoup
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
SCRAPER_HEADLESS = False  # Set to False to see browser in action
SCRAPER_TIMEOUT = 30  # Increased timeout
SKU_SEARCH_RETRIES = 3  # Increased retries
PARTIAL_NAME_SEARCH_RETRIES = 3
DEBUG = True

# Global job queue to ensure only one job runs at a time
job_queue = queue.Queue()
job_worker_running = False

class ProductScraper:
    def __init__(self):
        self.browser = None
        self.wait = None
        self.mongo_client = None
        self.jobs_collection = None
        self.current_job_id = None
        self.setup_database()

    def setup_database(self):
        """Setup MongoDB connection for job tracking"""
        try:
            self.mongo_client = MongoClient(MONGO_URI)
            db = self.mongo_client[MONGO_DB_NAME]
            self.jobs_collection = db["scraping_jobs"]
            if DEBUG:
                print("MongoDB connection established for product scraper")
        except Exception as e:
            print(f"Error setting up database: {e}")

    def setup_browser(self):
        """Setup Chrome browser with enhanced options for better reliability"""
        options = Options()
        if SCRAPER_HEADLESS:
            options.add_argument("--headless")
        
        # Enhanced Chrome options for stability and anti-detection
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-plugins")
        options.add_argument("--disable-images")  # Speed up loading
        options.add_argument("--disable-javascript")  # Only if not needed
        options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Set page load strategy
        options.page_load_strategy = 'normal'
        
        try:
            service = Service(ChromeDriverManager().install())
            self.browser = webdriver.Chrome(service=service, options=options)
            self.browser.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.browser.set_page_load_timeout(SCRAPER_TIMEOUT)
            self.wait = WebDriverWait(self.browser, SCRAPER_TIMEOUT)
            
            if DEBUG:
                print("✅ Browser setup successful")
            return True
            
        except Exception as e:
            if DEBUG:
                print(f"❌ Browser setup failed: {e}")
            return False

    def update_current_product(self, job_id: str, index: int, sku: str, name: str, status: str):
        """Update current product being scraped in real-time"""
        try:
            self.jobs_collection.update_one(
                {"id": job_id},
                {"$set": {
                    "current_product": {
                        "index": index,
                        "sku": sku,
                        "name": name,
                        "status": status
                    }
                }}
            )
        except Exception as e:
            if DEBUG:
                print(f"Error updating current product: {e}")

    def slugify(self, text: str) -> str:
        """Create URL slug from partial_name"""
        text = text.lower().strip()
        text = re.sub(r'[^a-z0-9]+', '-', text)
        text = re.sub(r'-+', '-', text)
        text = text.strip('-')
        return text

    def extract_field(self, pattern: str, text: str) -> str:
        """Extract field using regex pattern"""
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""

    def parse_description(self, description_text: str) -> Dict[str, str]:
        """Parse structured fields from product description text"""
        lines = [line.strip() for line in description_text.split('\n') if line.strip()]
        full_text = "\n".join(lines)

        # Extract fields
        sizes = self.extract_field(r'(?:Size:|Available in the following sizes:|Available in below sizes:)\s*(.*?)(?:\n|$)', full_text)
        color = self.extract_field(r'(?:Colour:|Color:)\s*(.*?)(?:\n|$)', full_text)
        material = self.extract_field(r'Material:\s*(.*?)(?:\n|$)', full_text)
        includes = self.extract_field(r'Includes:\s*(.*?)(?:\n|$)', full_text)
        washing = self.extract_field(r'(?:Washing Instructions:|Washing:)\s*(.*?)(?:\n|$)', full_text)
        brand = self.extract_field(r'Brand:\s*(.*?)(?:\n|$)', full_text)

        # Remove extracted parts from the full text
        patterns_to_remove = [
            r'(?:Size:|Available in the following sizes:|Available in below sizes:)\s*.*?(?:\n|$)',
            r'(?:Colour:|Color:)\s*.*?(?:\n|$)',
            r'Material:\s*.*?(?:\n|$)',
            r'Includes:\s*.*?(?:\n|$)',
            r'(?:Washing Instructions:|Washing:)\s*.*?(?:\n|$)',
            r'Brand:\s*.*?(?:\n|$)'
        ]

        for pattern in patterns_to_remove:
            full_text = re.sub(pattern, '', full_text, flags=re.IGNORECASE)

        main_description = full_text.strip()

        return {
            "Main Description": main_description,
            "Sizes": sizes,
            "Color": color,
            "Material": material,
            "Includes": includes,
            "Washing Instructions": washing,
            "Brand": brand
        }

    def fully_loaded(self) -> bool:
        """Check if page is fully loaded"""
        try:
            return self.browser.execute_script("return document.readyState") == "complete"
        except:
            return False

    def clear_browser_cache(self):
        """Clear browser cookies and cache"""
        try:
            self.browser.delete_all_cookies()
            self.browser.execute_script("window.localStorage.clear();")
            self.browser.execute_script("window.sessionStorage.clear();")
        except:
            pass

    def safe_find_element(self, by, value, timeout=10):
        """Safely find element with retry logic"""
        for attempt in range(3):
            try:
                element = WebDriverWait(self.browser, timeout).until(
                    EC.presence_of_element_located((by, value))
                )
                return element
            except TimeoutException:
                if attempt < 2:
                    time.sleep(2)
                    continue
                return None
            except Exception as e:
                if DEBUG:
                    print(f"Error finding element {value}: {e}")
                return None

    def smart_search(self, search_term: str, max_retries: int = 3) -> List:
        """Enhanced smart search with better error handling"""
        for attempt in range(max_retries):
            try:
                if DEBUG:
                    print(f"🔍 Search attempt {attempt + 1} for: {search_term}")

                self.browser.get("https://www.onlinehomeshop.com/")
                
                # Wait for page to load
                if not self.wait.until(lambda d: self.fully_loaded()):
                    continue

                time.sleep(2)  # Allow page to stabilize

                # Find search box
                search_box = self.safe_find_element(By.CSS_SELECTOR, "input#search", 15)
                if not search_box:
                    if DEBUG:
                        print("❗ Search box not found")
                    continue

                # Clear and enter search term
                search_box.clear()
                time.sleep(0.5)
                search_box.send_keys(search_term)
                time.sleep(1)
                search_box.send_keys(Keys.RETURN)

                # Wait for search results
                time.sleep(3)
                if not self.wait.until(lambda d: self.fully_loaded()):
                    continue

                # Find product links
                links = self.browser.find_elements(By.CSS_SELECTOR, "a.product-item-link")
                if links:
                    if DEBUG:
                        print(f"✅ Found {len(links)} product links")
                    return links

                # Retry search if no results
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue

            except WebDriverException as e:
                if DEBUG:
                    print(f"❗ WebDriver error in search: {e}")
                if attempt < max_retries - 1:
                    time.sleep(3)
                    continue
            except Exception as e:
                if DEBUG:
                    print(f"❗ Unexpected error in search: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue

        return []

    def scrape_current_page(self, idx: int, sku: str, product_name: str, product_url: str) -> Dict[str, Any]:
        """Enhanced page scraping with better error handling"""
        try:
            # Wait for page to load
            time.sleep(2)
            if not self.wait.until(lambda d: self.fully_loaded()):
                raise Exception("Page failed to load completely")

            # Try to get description with multiple selectors
            description = ""
            description_selectors = [
                "div#description",
                ".product-description",
                ".description",
                "#product-description"
            ]
            
            for selector in description_selectors:
                try:
                    desc_element = self.browser.find_element(By.CSS_SELECTOR, selector)
                    if desc_element.text.strip():
                        description = desc_element.text.strip()
                        break
                except:
                    continue
            
            if not description:
                description = "Description not available"
            
            parsed_desc = self.parse_description(description)
            
            # Extract image URLs with better error handling
            image_urls = []
            try:
                soup = BeautifulSoup(self.browser.page_source, 'html.parser')
                for img in soup.find_all('img'):
                    src = img.get('src')
                    if src and '/media/catalog/product/' in src and '/560x560/' not in src:
                        full_url = urljoin('https://www.onlinehomeshop.com', src)
                        if full_url not in image_urls:
                            image_urls.append(full_url)
            except Exception as e:
                if DEBUG:
                    print(f"Error extracting images: {e}")
            
            return {
                "Sr No": idx,
                "Product Name": product_name,
                "SKU": sku,
                "Description": description,
                "Main Description": parsed_desc["Main Description"],
                "Sizes": parsed_desc["Sizes"],
                "Color": parsed_desc["Color"],
                "Material": parsed_desc["Material"],
                "Includes": parsed_desc["Includes"],
                "Washing Instructions": parsed_desc["Washing Instructions"],
                "Brand": parsed_desc["Brand"],
                "Image URLs": "|".join(image_urls),
                "Product URL": product_url,
                "Error": ""
            }

        except Exception as e:
            error_msg = f"Failed to scrape page: {str(e)}"
            if DEBUG:
                print(f"❌ {error_msg}")
            
            return {
                "Sr No": idx,
                "Product Name": product_name,
                "SKU": sku,
                "Description": "Error occurred during scraping",
                "Main Description": "",
                "Sizes": "",
                "Color": "",
                "Material": "",
                "Includes": "",
                "Washing Instructions": "",
                "Brand": "",
                "Image URLs": "",
                "Product URL": product_url,
                "Error": error_msg
            }

    def check_color_variants(self, search_term: str, idx: int, sku: str) -> Optional[Dict[str, Any]]:
        """Enhanced color variant checking"""
        try:
            soup = BeautifulSoup(self.browser.page_source, 'html.parser')
            color_options = soup.select('.other-colours .color-list .other-colours-link')
            
            for color_option in color_options:
                try:
                    if color_option.name == 'a':
                        color_title = color_option.get('title', '').strip()
                        color_href = color_option.get('href')
                        
                        if color_title.lower() == search_term.lower():
                            if DEBUG:
                                print(f"🎯 [Color Match] Found: {color_title}")
                            
                            self.browser.get(color_href)
                            time.sleep(2)
                            if not self.wait.until(lambda d: self.fully_loaded()):
                                continue
                            
                            new_page_title = self.safe_find_element(By.CSS_SELECTOR, "h1.page-title")
                            if new_page_title:
                                title_text = new_page_title.text.strip()
                                if title_text.lower() == search_term.lower():
                                    return self.scrape_current_page(idx, sku, title_text, color_href)
                    else:
                        color_title = color_option.get('title', '').strip()
                        if color_title.lower() == search_term.lower():
                            page_title_elem = self.safe_find_element(By.CSS_SELECTOR, "h1.page-title")
                            if page_title_elem:
                                return self.scrape_current_page(idx, sku, page_title_elem.text.strip(), self.browser.current_url)
                except Exception as e:
                    if DEBUG:
                        print(f"Error checking color variant: {e}")
                    continue
        
        except Exception as e:
            if DEBUG:
                print(f"Error in color variant check: {e}")
        
        return None

    def update_job_progress(self, job_id: str, successful: int, failed: int, total: int):
        """Update job progress in database"""
        try:
            progress = ((successful + failed) / total) * 100 if total > 0 else 0
            
            update_data = {
                "successful_scrapes": successful,
                "failed_scrapes": failed,
                "progress": progress
            }
            
            if progress >= 100:
                update_data["status"] = "completed"
                update_data["completed_at"] = datetime.utcnow().isoformat()
                # Clear current product when completed
                update_data["current_product"] = None
            
            self.jobs_collection.update_one(
                {"id": job_id},
                {"$set": update_data}
            )
        except Exception as e:
            if DEBUG:
                print(f"Error updating job progress: {e}")

    def save_temp_results(self, job_id: str, success_data: List[Dict], fail_data: List[Dict]):
        """Save temporary results for real-time download"""
        results_dir = "scraping_results"
        os.makedirs(results_dir, exist_ok=True)
        
        try:
            # Save successful scrapes
            if success_data:
                success_filename = f"temp_success_{job_id[:8]}.csv"
                success_path = os.path.join(results_dir, success_filename)
                
                csv_columns = [
                    "Sr No", "Product Name", "SKU", "Description", "Main Description", "Sizes", "Color",
                    "Material", "Includes", "Washing Instructions", "Brand", "Image URLs", "Product URL", "Error"
                ]
                
                with open(success_path, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=csv_columns)
                    writer.writeheader()
                    writer.writerows(success_data)
            
            # Save failed scrapes
            if fail_data:
                fail_filename = f"temp_failed_{job_id[:8]}.csv"
                fail_path = os.path.join(results_dir, fail_filename)
                
                fail_columns = ["Sr No", "Product Name", "SKU", "Error"]
                
                with open(fail_path, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=fail_columns)
                    writer.writeheader()
                    writer.writerows(fail_data)
                    
        except Exception as e:
            if DEBUG:
                print(f"Error saving temp results: {e}")

    def save_results_to_files(self, job_id: str, success_data: List[Dict], fail_data: List[Dict]) -> Dict[str, str]:
        """Save final results to CSV files"""
        date_tag = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        
        # Create results directory if it doesn't exist
        results_dir = "scraping_results"
        os.makedirs(results_dir, exist_ok=True)
        
        files = {}
        
        # Save successful scrapes
        if success_data:
            success_filename = f"product_scraping_success_{job_id[:8]}_{date_tag}.csv"
            success_path = os.path.join(results_dir, success_filename)
            
            csv_columns = [
                "Sr No", "Product Name", "SKU", "Description", "Main Description", "Sizes", "Color",
                "Material", "Includes", "Washing Instructions", "Brand", "Image URLs", "Product URL", "Error"
            ]
            
            with open(success_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=csv_columns)
                writer.writeheader()
                writer.writerows(success_data)
            
            files["results_file"] = success_filename
        
        # Save failed scrapes
        if fail_data:
            fail_filename = f"product_scraping_failed_{job_id[:8]}_{date_tag}.csv"
            fail_path = os.path.join(results_dir, fail_filename)
            
            fail_columns = ["Sr No", "Product Name", "SKU", "Error"]
            
            with open(fail_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fail_columns)
                writer.writeheader()
                writer.writerows(fail_data)
            
            files["errors_file"] = fail_filename
        
        return files

    def scrape_products(self, job_id: str, products: List[Dict[str, str]]) -> Dict[str, Any]:
        """Enhanced main scraping function with better error handling and progress tracking"""
        if not OHS_EMAIL or not OHS_PASSWORD:
            raise ValueError("Missing required environment variables: OHS_EMAIL and/or OHS_PASSWORD")

        self.current_job_id = job_id
        
        # Setup browser with retry
        browser_setup_success = False
        for attempt in range(3):
            if self.setup_browser():
                browser_setup_success = True
                break
            else:
                if DEBUG:
                    print(f"Browser setup attempt {attempt + 1} failed, retrying...")
                time.sleep(5)
        
        if not browser_setup_success:
            raise Exception("Failed to setup browser after multiple attempts")
        
        try:
            success_data = []
            fail_data = []
            
            # Update job status to running
            self.jobs_collection.update_one(
                {"id": job_id},
                {"$set": {"status": "running"}}
            )
            
            for idx, product in enumerate(products, start=1):
                # Check if job was stopped
                job_status = self.get_job_status(job_id)
                if job_status and job_status.get("status") == "stopped":
                    if DEBUG:
                        print("🛑 Job was stopped by user")
                    break
                
                sku = product.get("sku", "")
                search_term = product.get("partial_name", "")
                
                if DEBUG:
                    print(f"🍋 Processing product [{idx}/{len(products)}] | SKU: {sku} | Name: \"{search_term}\"")
                
                # Update current product in real-time
                self.update_current_product(job_id, idx, sku, search_term, "Starting search")
                
                success = False
                error_msg = ""
                
                # 1. Try searching by SKU
                for attempt in range(1, SKU_SEARCH_RETRIES + 1):
                    if success:
                        break
                    
                    try:
                        if DEBUG:
                            print(f"🔍 [SKU Search] Attempt {attempt}/{SKU_SEARCH_RETRIES}")
                        
                        self.update_current_product(job_id, idx, sku, search_term, f"SKU search attempt {attempt}")
                        self.clear_browser_cache()
                        links = self.smart_search(sku)
                        
                        found_product = None
                        for link in links:
                            try:
                                title = link.text.strip()
                                if any(word in title.lower() for word in search_term.lower().split()):
                                    found_product = {"url": link.get_attribute("href"), "name": title}
                                    break
                            except:
                                continue
                        
                        if found_product:
                            self.update_current_product(job_id, idx, sku, search_term, "Loading product page")
                            self.browser.get(found_product['url'])
                            time.sleep(2)
                            if not self.wait.until(lambda d: self.fully_loaded()):
                                continue
                            
                            page_title_elem = self.safe_find_element(By.CSS_SELECTOR, "h1.page-title")
                            if page_title_elem:
                                page_title = page_title_elem.text.strip()
                                if page_title.lower() == search_term.lower():
                                    if DEBUG:
                                        print(f"🎯 [SKU Match] Found: {page_title}")
                                    self.update_current_product(job_id, idx, sku, search_term, "Scraping product data")
                                    result = self.scrape_current_page(idx, sku, page_title, found_product['url'])
                                    success_data.append(result)
                                    success = True
                                else:
                                    # Check color variants
                                    self.update_current_product(job_id, idx, sku, search_term, "Checking color variants")
                                    variant_result = self.check_color_variants(search_term, idx, sku)
                                    if variant_result:
                                        success_data.append(variant_result)
                                        success = True
                    
                    except Exception as e:
                        error_msg = f"SKU search failed: {str(e)}"
                        if DEBUG:
                            print(f"❗ [SKU Search Failed] {error_msg}")
                        time.sleep(2)  # Wait before retry

                # 2. Try searching by partial name if SKU search failed
                if not success:
                    for attempt in range(1, PARTIAL_NAME_SEARCH_RETRIES + 1):
                        if success:
                            break
                        
                        try:
                            if DEBUG:
                                print(f"🔍 [Partial Name Search] Attempt {attempt}/{PARTIAL_NAME_SEARCH_RETRIES}")
                            
                            self.update_current_product(job_id, idx, sku, search_term, f"Name search attempt {attempt}")
                            self.clear_browser_cache()
                            links = self.smart_search(search_term)
                            
                            found_product = None
                            for link in links:
                                try:
                                    title = link.text.strip()
                                    if any(word in title.lower() for word in search_term.lower().split()):
                                        found_product = {"url": link.get_attribute("href"), "name": title}
                                        break
                                except:
                                    continue
                            
                            if found_product:
                                self.update_current_product(job_id, idx, sku, search_term, "Loading product page")
                                self.browser.get(found_product['url'])
                                time.sleep(2)
                                if not self.wait.until(lambda d: self.fully_loaded()):
                                    continue
                                
                                page_title_elem = self.safe_find_element(By.CSS_SELECTOR, "h1.page-title")
                                if page_title_elem:
                                    page_title = page_title_elem.text.strip()
                                    if page_title.lower() == search_term.lower():
                                        if DEBUG:
                                            print(f"🎯 [Partial Name Match] Found: {page_title}")
                                        self.update_current_product(job_id, idx, sku, search_term, "Scraping product data")
                                        result = self.scrape_current_page(idx, sku, page_title, found_product['url'])
                                        success_data.append(result)
                                        success = True
                                    else:
                                        # Check color variants
                                        self.update_current_product(job_id, idx, sku, search_term, "Checking color variants")
                                        variant_result = self.check_color_variants(search_term, idx, sku)
                                        if variant_result:
                                            success_data.append(variant_result)
                                            success = True
                        
                        except Exception as e:
                            error_msg = f"Name search failed: {str(e)}"
                            if DEBUG:
                                print(f"❗ [Partial Name Search Failed] {error_msg}")
                            time.sleep(2)

                # 3. Fallback URL attempt
                if not success:
                    try:
                        slug = self.slugify(search_term)
                        fallback_url = f"https://www.onlinehomeshop.com/{slug}"
                        
                        if DEBUG:
                            print(f"🛑 [Fallback] Trying: {fallback_url}")
                        
                        self.update_current_product(job_id, idx, sku, search_term, "Trying fallback URL")
                        self.browser.get(fallback_url)
                        time.sleep(2)
                        if not self.wait.until(lambda d: self.fully_loaded()):
                            raise Exception("Fallback page failed to load")
                        
                        title_elem = self.safe_find_element(By.CSS_SELECTOR, "h1.page-title")
                        title = title_elem.text.strip() if title_elem else "Unknown product"
                        
                        if title.lower() != "unknown product" and "not found" not in title.lower():
                            self.update_current_product(job_id, idx, sku, search_term, "Scraping fallback data")
                            result = self.scrape_current_page(idx, sku, title, fallback_url)
                            success_data.append(result)
                            success = True
                            if DEBUG:
                                print(f"✅ Fallback Success: {title}")
                    
                    except Exception as e:
                        error_msg = f"Fallback failed: {str(e)}"
                        if DEBUG:
                            print(f"🚫 [Fallback Failed] {error_msg}")

                # Record failure if not successful
                if not success:
                    final_error = error_msg or "Product not found after all attempts"
                    fail_data.append({
                        "Sr No": idx,
                        "Product Name": search_term,
                        "SKU": sku,
                        "Error": final_error
                    })
                    if DEBUG:
                        print(f"❌ Failed to scrape product: {final_error}")
                
                # Update progress and save temp files
                self.update_job_progress(job_id, len(success_data), len(fail_data), len(products))
                self.save_temp_results(job_id, success_data, fail_data)
                
                # Small delay between products
                time.sleep(2)
            
            # Final progress update
            self.update_job_progress(job_id, len(success_data), len(fail_data), len(products))
            
            # Save final results to files
            files = self.save_results_to_files(job_id, success_data, fail_data)
            
            # Update job with file information
            if files:
                self.jobs_collection.update_one(
                    {"id": job_id},
                    {"$set": files}
                )
            
            if DEBUG:
                print(f"✅ Scraping completed! Success: {len(success_data)}, Failed: {len(fail_data)}")
            
            return {
                "success": True,
                "total_products": len(products),
                "successful_scrapes": len(success_data),
                "failed_scrapes": len(fail_data),
                "success_rate": (len(success_data) / len(products)) * 100 if products else 0,
                "files": files
            }
        
        except Exception as e:
            # Update job status to failed
            self.jobs_collection.update_one(
                {"id": job_id},
                {"$set": {"status": "failed", "error": str(e), "current_product": None}}
            )
            raise e
        
        finally:
            if self.browser:
                try:
                    self.browser.quit()
                except:
                    pass

    def create_job(self, products):
        """Create a new scraping job with unique ID"""
        job_id = str(uuid.uuid4())
        job_doc = {
            "id": job_id,
            "status": "pending",
            "total_products": len(products),
            "successful_scrapes": 0,
            "failed_scrapes": 0,
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "products": products,  # Store products for retry functionality
            "current_product": None
        }
        
        self.jobs_collection.insert_one(job_doc)
        return job_id

    def get_scraping_jobs(self) -> List[Dict]:
        """Get all scraping jobs"""
        try:
            jobs = list(self.jobs_collection.find({}, {"_id": 0}))
            return sorted(jobs, key=lambda x: x.get("created_at", ""), reverse=True)
        except Exception as e:
            if DEBUG:
                print(f"Error fetching scraping jobs: {e}")
            return []

    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get specific job status"""
        try:
            job = self.jobs_collection.find_one({"id": job_id}, {"_id": 0})
            return job
        except Exception as e:
            if DEBUG:
                print(f"Error fetching job status: {e}")
            return None

    def close(self):
        """Close database connection"""
        if self.mongo_client:
            self.mongo_client.close()


def process_job_queue():
    """Worker function to process jobs one at a time"""
    global job_worker_running
    
    while True:
        try:
            # Get next job from queue (blocks if queue is empty)
            job_data = job_queue.get()
            if job_data is None:  # Shutdown signal
                break
                
            job_id, products = job_data
            
            if DEBUG:
                print(f"🚀 Starting job {job_id} with {len(products)} products")
            
            scraper = ProductScraper()
            try:
                result = scraper.scrape_products(job_id, products)
                if DEBUG:
                    print(f"✅ Job {job_id} completed successfully")
            except Exception as e:
                if DEBUG:
                    print(f"❌ Job {job_id} failed: {e}")
            finally:
                scraper.close()
                
            job_queue.task_done()
            
        except Exception as e:
            if DEBUG:
                print(f"Error in job queue worker: {e}")


# Start the job queue worker thread
def start_job_worker():
    global job_worker_running
    if not job_worker_running:
        worker_thread = threading.Thread(target=process_job_queue, daemon=True)
        worker_thread.start()
        job_worker_running = True


# Enhanced function for background scraping with queue
def run_product_scraping(job_id: str, products: List[Dict[str, str]]):
    """Queue a product scraping job"""
    start_job_worker()  # Ensure worker is running
    job_queue.put((job_id, products))


if __name__ == "__main__":
    # Test the scraper
    scraper = ProductScraper()
    
    test_products = [
        {
            "sku": "SACCFLFCL45",
            "partial_name": "Sienna Fluffy Cushion Covers - Charcoal"
        }
    ]
    
    job_id = scraper.create_job(test_products)
    print(f"Created test job: {job_id}")
    
    result = scraper.scrape_products(job_id, test_products)
    print(f"Test result: {result}")
    
    scraper.close() 