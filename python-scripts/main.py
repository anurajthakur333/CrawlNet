from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scrape_orders import scrape_orders
from dotenv import load_dotenv
import os

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
        orders = scrape_orders()
        return {"orders": orders, "count": len(orders)}
    except Exception as e:
        print(f"Error in get_orders: {e}")
        return {"orders": [], "error": str(e)}

# Add a health check endpoint for debugging
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "API is running"}