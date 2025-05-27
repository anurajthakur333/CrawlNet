from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scrape_orders import scrape_orders
from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()

app = FastAPI()

# Add CORS middleware to allow requests from your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",  # Vite default port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
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
        mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri)
        db = client["ohs"]
        collection = db["orders"]
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
        print(f"Error in get_orders: {e}")
        return {"orders": [], "error": str(e), "count": 0, "scraped_count": 0}

@app.get("/orders_db")
def get_orders_db():
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["ohs"]
    collection = db["orders"]
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

@app.delete("/orders_db")
def delete_all_orders():
    try:
        mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
        client = MongoClient(mongo_uri)
        db = client["ohs"]
        collection = db["orders"]
        
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
        return {
            "success": False,
            "error": str(e)
        }

# Add a health check endpoint for debugging
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API is running"}