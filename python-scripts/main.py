from fastapi import FastAPI
from scrape_orders import scrape_orders
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

@app.get("/orders")
def get_orders():
    return {"orders": scrape_orders()} 