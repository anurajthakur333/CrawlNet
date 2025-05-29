from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
from scraper import scrape_orders
from order_details_scraper import scrape_order_details, scrape_multiple_order_details
from product_scraper import ProductScraper, run_product_scraping
import threading
from dotenv import load_dotenv
import os
from pymongo import MongoClient
from datetime import datetime

# Load environment variables
load_dotenv()

# Pydantic models for request validation
class ProductToScrape(BaseModel):
    sku: str
    partial_name: str
    order_id: str = None
    order_number: str = None

class ProductScrapingRequest(BaseModel):
    products: List[ProductToScrape]

app = FastAPI()

# Get configuration from environment variables
CORS_ORIGINS = os.environ["CORS_ORIGINS"].split(",")
MONGO_URI = os.environ["MONGO_URI"]
OHS_EMAIL = os.environ["OHS_EMAIL"]
OHS_PASSWORD = os.environ["OHS_PASSWORD"]
API_HOST = os.environ.get("API_HOST")
API_PORT = int(os.environ.get("API_PORT"))
DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")

# Hardcoded configuration
MONGO_DB_NAME = "ohs"
MONGO_COLLECTION_NAME = "orders"

# Add CORS middleware to allow requests from your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/orders")
def get_orders():
    try:
        # First, trigger the orders list scraping (which saves to DB)
        scraped_orders = scrape_orders()
        
        if DEBUG:
            print(f"Scraped {len(scraped_orders)} orders from OnlineHomeShop")
        
        # Now automatically scrape details for each order using bulk method
        order_details_results = []
        successful_details_scrapes = 0
        failed_details_scrapes = 0
        
        # Get order IDs for bulk scraping
        order_ids = [order.get("order_id") for order in scraped_orders if order.get("order_id")]
        
        if order_ids:
            try:
                if DEBUG:
                    print(f"Starting bulk order details scraping for {len(order_ids)} orders...")
                
                # Use bulk scraping method - login once, scrape all
                bulk_results = scrape_multiple_order_details(order_ids)
                
                for result in bulk_results:
                    if result["success"]:
                        order_details_results.append({
                            "order_id": result["order_id"],
                            "success": True,
                            "total_products": result["total_products"],
                            "message": f"Successfully scraped {result['total_products']} products"
                        })
                        successful_details_scrapes += 1
                    else:
                        order_details_results.append({
                            "order_id": result["order_id"],
                            "success": False,
                            "error": result.get("error", "Unknown error"),
                            "total_products": 0
                        })
                        failed_details_scrapes += 1
                        
            except Exception as e:
                if DEBUG:
                    print(f"Error in bulk order details scraping: {e}")
                # If bulk scraping fails, mark all as failed
                failed_details_scrapes = len(order_ids)
                for order_id in order_ids:
                    order_details_results.append({
                        "order_id": order_id,
                        "success": False,
                        "error": str(e),
                        "total_products": 0
                    })
        else:
            if DEBUG:
                print("No valid order IDs found for details scraping")
        
        # Then return the orders from DB (properly formatted) with stats
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db[MONGO_COLLECTION_NAME]
        orders = list(collection.find({}))
        
        # Calculate statistics
        total_orders = len(orders)
        completed_orders = len([o for o in orders if o.get("status", "").lower() == "complete"])
        canceled_orders = len([o for o in orders if o.get("status", "").lower() == "canceled"])
        
        # Remove or convert _id for each order
        for order in orders:
            if "_id" in order:
                order.pop("_id", None)  # Remove _id completely
        
        client.close()
        return {
            "orders": orders, 
            "count": len(orders),
            "scraped_count": len(scraped_orders) if scraped_orders else 0,
            "order_details_scraped": successful_details_scrapes,
            "order_details_failed": failed_details_scrapes,
            "order_details_results": order_details_results,
            "stats": {
                "total": total_orders,
                "completed": completed_orders,
                "canceled": canceled_orders,
                "db_count": total_orders
            }
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in get_orders: {e}")
        return {"orders": [], "error": str(e), "count": 0, "scraped_count": 0}

@app.get("/orders_db")
def get_orders_db():
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db[MONGO_COLLECTION_NAME]
        orders = list(collection.find({}))
        
        # Calculate statistics
        total_orders = len(orders)
        completed_orders = len([o for o in orders if o.get("status", "").lower() == "complete"])
        canceled_orders = len([o for o in orders if o.get("status", "").lower() == "canceled"])
        
        # Remove or convert _id for each order
        for order in orders:
            if "_id" in order:
                order.pop("_id", None)  # Remove _id completely
        
        client.close()
        return {
            "orders": orders,
            "stats": {
                "total": total_orders,
                "completed": completed_orders,
                "canceled": canceled_orders,
                "db_count": total_orders
            }
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in get_orders_db: {e}")
        return {"orders": [], "error": str(e), "stats": {"total": 0, "completed": 0, "canceled": 0, "db_count": 0}}

@app.delete("/orders_db")
def delete_all_orders():
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        orders_collection = db[MONGO_COLLECTION_NAME]
        order_details_collection = db["order_details"]
        
        # Get count before deletion
        orders_count_before = orders_collection.count_documents({})
        order_details_count_before = order_details_collection.count_documents({})
        
        # Delete all orders
        orders_result = orders_collection.delete_many({})
        
        # Delete all order details
        order_details_result = order_details_collection.delete_many({})
        
        client.close()
        return {
            "success": True,
            "message": f"Deleted {orders_result.deleted_count} orders and {order_details_result.deleted_count} order details from database",
            "orders_deleted": orders_result.deleted_count,
            "order_details_deleted": order_details_result.deleted_count,
            "orders_count_before": orders_count_before,
            "order_details_count_before": order_details_count_before
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in delete_all_orders: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/order_details/{order_id}")
def get_order_details(order_id: str):
    """Scrape and return detailed product information for a specific order"""
    try:
        # Trigger the order details scraping
        result = scrape_order_details(order_id)
        
        return {
            "success": True,
            "order_id": order_id,
            "order_info": result["order_info"],
            "products": result["products"],
            "total_products": result["total_products"],
            "scraped_at": result.get("scraped_at")
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in get_order_details: {e}")
        return {
            "success": False,
            "error": str(e),
            "order_id": order_id,
            "products": [],
            "total_products": 0
        }

@app.get("/order_details_db/{order_id}")
def get_order_details_from_db(order_id: str):
    """Get order details from database without scraping"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db["order_details"]
        
        # Find the order details document
        order_doc = collection.find_one({"order_id": order_id})
        
        if order_doc:
            # Remove MongoDB _id field
            order_doc.pop("_id", None)
            
            client.close()
            return {
                "success": True,
                "found": True,
                **order_doc
            }
        else:
            client.close()
            return {
                "success": True,
                "found": False,
                "order_id": order_id,
                "message": "Order details not found in database"
            }
            
    except Exception as e:
        if DEBUG:
            print(f"Error in get_order_details_from_db: {e}")
        return {
            "success": False,
            "error": str(e),
            "order_id": order_id
        }

@app.delete("/order_details_db/{order_id}")
def delete_order_details(order_id: str):
    """Delete order details for a specific order from database"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db["order_details"]
        
        # Delete the order details
        result = collection.delete_many({"order_id": order_id})
        
        client.close()
        return {
            "success": True,
            "message": f"Deleted order details for order {order_id}",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in delete_order_details: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/bulk_order_details")
def bulk_scrape_order_details(request_data: dict):
    """Scrape order details for multiple orders"""
    try:
        order_ids = request_data.get("order_ids", [])
        if not order_ids:
            return {
                "success": False,
                "error": "No order IDs provided",
                "results": []
            }
        
        results = []
        successful_scrapes = 0
        failed_scrapes = 0
        
        for order_id in order_ids:
            try:
                if DEBUG:
                    print(f"Scraping order details for order {order_id}")
                
                result = scrape_order_details(order_id)
                
                results.append({
                    "order_id": order_id,
                    "success": True,
                    "total_products": result["total_products"],
                    "message": f"Successfully scraped {result['total_products']} products"
                })
                successful_scrapes += 1
                
            except Exception as e:
                if DEBUG:
                    print(f"Error scraping order {order_id}: {e}")
                
                results.append({
                    "order_id": order_id,
                    "success": False,
                    "error": str(e),
                    "total_products": 0
                })
                failed_scrapes += 1
        
        return {
            "success": True,
            "total_orders": len(order_ids),
            "successful_scrapes": successful_scrapes,
            "failed_scrapes": failed_scrapes,
            "results": results
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error in bulk_scrape_order_details: {e}")
        return {
            "success": False,
            "error": str(e),
            "results": []
        }

# === PRODUCT SCRAPER ENDPOINTS ===

@app.get("/scraping_jobs")
def get_scraping_jobs():
    """Get all product scraping jobs"""
    try:
        scraper = ProductScraper()
        jobs = scraper.get_scraping_jobs()
        scraper.close()
        
        return {
            "success": True,
            "jobs": jobs
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in get_scraping_jobs: {e}")
        return {
            "success": False,
            "error": str(e),
            "jobs": []
        }

@app.get("/scraping_job_status/{job_id}")
def get_scraping_job_status(job_id: str):
    """Get status of a specific scraping job"""
    try:
        scraper = ProductScraper()
        job = scraper.get_job_status(job_id)
        scraper.close()
        
        if job:
            return {
                "success": True,
                "job": job
            }
        else:
            return {
                "success": False,
                "error": "Job not found",
                "job": None
            }
    except Exception as e:
        if DEBUG:
            print(f"Error in get_scraping_job_status: {e}")
        return {
            "success": False,
            "error": str(e),
            "job": None
        }

@app.post("/start_product_scraping")
def start_product_scraping(request: ProductScrapingRequest, background_tasks: BackgroundTasks):
    """Start a new product scraping job with queue management"""
    try:
        # Check if there's already a running job
        scraper = ProductScraper()
        jobs = scraper.get_scraping_jobs()
        
        running_jobs = [job for job in jobs if job.get("status") in ["running", "pending"]]
        if running_jobs:
            scraper.close()
            return {
                "success": False,
                "error": "Another scraping job is already running. Only one job can run at a time."
            }
        
        products = [product.dict() for product in request.products]
        
        # Create job in database
        job_id = scraper.create_job(products)
        job = scraper.get_job_status(job_id)
        scraper.close()
        
        # Queue the scraping job
        run_product_scraping(job_id, products)
        
        return {
            "success": True,
            "message": f"Queued scraping job for {len(products)} products",
            "job": job
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error starting scraping: {e}")
        return {"success": False, "error": str(e)}

@app.get("/generate_products_from_orders")
def generate_products_from_orders():
    """Generate products list from order details in database"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        collection = db["order_details"]
        
        # Get all order details
        order_details = list(collection.find({}))
        
        products = []
        seen_skus = set()
        
        for order_doc in order_details:
            order_products = order_doc.get("products", [])
            
            for product in order_products:
                sku = product.get("sku", "").strip()
                product_name = product.get("product_name", "").strip()
                
                if sku and product_name and sku not in seen_skus:
                    products.append({
                        "sku": sku,
                        "partial_name": product_name,
                        "order_id": order_doc.get("order_id"),
                        "order_number": order_doc.get("order_info", {}).get("order_number")
                    })
                    seen_skus.add(sku)
        
        client.close()
        
        return {
            "success": True,
            "products": products,
            "total_unique_products": len(products)
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error in generate_products_from_orders: {e}")
        return {
            "success": False,
            "error": str(e),
            "products": []
        }

@app.get("/download_scraping_file/{filename}")
def download_scraping_file(filename: str):
    """Download a scraping results file"""
    try:
        file_path = os.path.join("scraping_results", filename)
        
        if os.path.exists(file_path):
            return FileResponse(
                path=file_path,
                media_type="application/octet-stream",
                filename=filename
            )
        else:
            return {
                "success": False,
                "error": "File not found"
            }
    except Exception as e:
        if DEBUG:
            print(f"Error in download_scraping_file: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/stop_scraping_job/{job_id}")
def stop_scraping_job(job_id: str):
    """Stop a running scraping job"""
    try:
        scraper = ProductScraper()
        result = scraper.jobs_collection.update_one(
            {"id": job_id, "status": {"$in": ["pending", "running"]}},
            {"$set": {"status": "stopped", "stopped_at": datetime.utcnow().isoformat()}}
        )
        scraper.close()
        
        if result.modified_count > 0:
            return {"success": True, "message": f"Job {job_id} stopped successfully"}
        else:
            return {"success": False, "error": "Job not found or not running"}
    except Exception as e:
        if DEBUG:
            print(f"Error stopping job: {e}")
        return {"success": False, "error": str(e)}

@app.delete("/delete_scraping_job/{job_id}")
def delete_scraping_job(job_id: str):
    """Delete a scraping job"""
    try:
        scraper = ProductScraper()
        result = scraper.jobs_collection.delete_one({"id": job_id})
        scraper.close()
        
        if result.deleted_count > 0:
            return {"success": True, "message": f"Job {job_id} deleted successfully"}
        else:
            return {"success": False, "error": "Job not found"}
    except Exception as e:
        if DEBUG:
            print(f"Error deleting job: {e}")
        return {"success": False, "error": str(e)}

@app.post("/retry_scraping_job/{job_id}")
def retry_scraping_job(job_id: str, background_tasks: BackgroundTasks):
    """Retry a failed scraping job with queue management"""
    try:
        scraper = ProductScraper()
        
        # Check if there's already a running job
        jobs = scraper.get_scraping_jobs()
        running_jobs = [job for job in jobs if job.get("status") in ["running", "pending"]]
        if running_jobs:
            scraper.close()
            return {
                "success": False,
                "error": "Another scraping job is already running. Please wait for it to complete."
            }
        
        job = scraper.get_job_status(job_id)
        
        if not job:
            scraper.close()
            return {"success": False, "error": "Job not found"}
        
        if job["status"] not in ["failed", "stopped"]:
            scraper.close()
            return {"success": False, "error": "Job is not in a retryable state"}
        
        # Reset job status and counters
        scraper.jobs_collection.update_one(
            {"id": job_id},
            {"$set": {
                "status": "pending",
                "successful_scrapes": 0,
                "failed_scrapes": 0,
                "progress": 0.0,
                "error": None,
                "current_product": None,
                "retried_at": datetime.utcnow().isoformat()
            }}
        )
        
        # Get products from original job
        products = job.get("products", [])
        scraper.close()
        
        # Queue the scraping job
        run_product_scraping(job_id, products)
        
        return {"success": True, "message": f"Job {job_id} queued for retry"}
        
    except Exception as e:
        if DEBUG:
            print(f"Error retrying job: {e}")
        return {"success": False, "error": str(e)}

@app.delete("/clear_all_scraping_jobs")
def clear_all_scraping_jobs():
    """Clear all scraping jobs"""
    try:
        scraper = ProductScraper()
        result = scraper.jobs_collection.delete_many({})
        scraper.close()
        
        return {
            "success": True,
            "message": f"Cleared {result.deleted_count} jobs",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        if DEBUG:
            print(f"Error clearing jobs: {e}")
        return {"success": False, "error": str(e)}

# Add a health check endpoint for debugging
@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "message": "API is running",
        "config": {
            "host": API_HOST,
            "port": API_PORT,
            "debug": DEBUG,
            "mongo_db": MONGO_DB_NAME,
            "cors_origins": CORS_ORIGINS
        }
    }

@app.delete("/order/{order_id}")
def delete_single_order(order_id: str):
    """Delete a single order from the orders collection"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        orders_collection = db[MONGO_COLLECTION_NAME]
        
        # Delete the order by order_number (since that's the field name used)
        # Try both order_id and order_number for compatibility
        result = orders_collection.delete_one({
            "$or": [
                {"order_id": order_id},
                {"order_number": order_id}
            ]
        })
        
        if result.deleted_count > 0:
            # Also delete order details if they exist
            order_details_collection = db["order_details"]
            order_details_collection.delete_one({"order_id": order_id})
            
            client.close()
            return {
                "success": True,
                "message": f"Successfully deleted order {order_id} and its details",
                "deleted_count": result.deleted_count
            }
        else:
            client.close()
            return {
                "success": False,
                "error": f"Order {order_id} not found"
            }
    except Exception as e:
        if DEBUG:
            print(f"Error in delete_single_order: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.delete("/orders/bulk")
def delete_multiple_orders(request_data: dict):
    """Delete multiple orders from the orders collection"""
    try:
        order_ids = request_data.get("order_ids", [])
        if not order_ids:
            return {
                "success": False,
                "error": "No order IDs provided"
            }
        
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB_NAME]
        orders_collection = db[MONGO_COLLECTION_NAME]
        order_details_collection = db["order_details"]
        
        deleted_count = 0
        for order_id in order_ids:
            # Delete order
            result = orders_collection.delete_one({
                "$or": [
                    {"order_id": order_id},
                    {"order_number": order_id}
                ]
            })
            
            if result.deleted_count > 0:
                deleted_count += result.deleted_count
                # Also delete order details if they exist
                order_details_collection.delete_one({"order_id": order_id})
        
        client.close()
        return {
            "success": True,
            "message": f"Successfully deleted {deleted_count} orders and their details",
            "deleted_count": deleted_count,
            "requested_count": len(order_ids)
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error in delete_multiple_orders: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/send_product_to_scraper")
def send_product_to_scraper(product: ProductToScrape, background_tasks: BackgroundTasks):
    """Send a single product to the product scraper"""
    try:
        # Check if there's already a running job
        scraper = ProductScraper()
        jobs = scraper.get_scraping_jobs()
        running_jobs = [job for job in jobs if job.get("status") in ["running", "pending"]]
        if running_jobs:
            scraper.close()
            return {
                "success": False,
                "error": "Another scraping job is already running. Please wait for it to complete."
            }
        
        # Create a new scraping job with just this one product
        job_id = f"single_product_{int(datetime.utcnow().timestamp())}"
        
        # Store the job in database
        job_doc = {
            "id": job_id,
            "status": "pending",
            "total_products": 1,
            "successful_scrapes": 0,
            "failed_scrapes": 0,
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "products": [product.dict()],
            "current_product": None
        }
        
        scraper.jobs_collection.insert_one(job_doc)
        scraper.close()
        
        # Queue the scraping job
        run_product_scraping(job_id, [product.dict()])
        
        return {
            "success": True,
            "message": f"Product '{product.partial_name}' (SKU: {product.sku}) has been queued for scraping",
            "job_id": job_id
        }
        
    except Exception as e:
        if DEBUG:
            print(f"Error in send_product_to_scraper: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# Add a health check endpoint for debugging

# Add main block for running the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT, reload=DEBUG)