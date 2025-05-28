from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ScrapOrders import scrape_orders
from dotenv import load_dotenv
import os
from pymongo import MongoClient

# Load environment variables
load_dotenv()

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
        # Trigger the scraping (which saves to DB)
        scraped_orders = scrape_orders()
        
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
        collection = db[MONGO_COLLECTION_NAME]
        
        # Get count before deletion
        count_before = collection.count_documents({})
        
        # Delete all orders
        result = collection.delete_many({})
        
        client.close()
        return {
            "success": True,
            "message": f"Deleted {result.deleted_count} orders from database",
            "deleted_count": result.deleted_count,
            "count_before": count_before
        }
    except Exception as e:
        if DEBUG:
            print(f"Error in delete_all_orders: {e}")
        return {
            "success": False,
            "error": str(e)
        }

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

# Add main block for running the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT, reload=DEBUG)