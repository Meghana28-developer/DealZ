import os
import sys
# Ensure the parent directory is in sys.path so 'app' module can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from app.config import PORT, HOST
from app.database import init_db, get_all_products, get_product_by_id, get_product_reviews, search_products
from app.agent import get_recommendation, calculate_deal_score, get_buy_or_wait_signal, heuristic_summarize_reviews

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize and seed the SQLite database
    init_db()
    yield
    # Shutdown: nothing to clean up for SQLite

# Define Pydantic request models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class CompareRequest(BaseModel):
    product_ids: List[str]

class GoalSetupRequest(BaseModel):
    query: str
    budget: float

app = FastAPI(
    title="DEALZ API",
    description="AI Shopping Concierge Engine Backend",
    lifespan=lifespan
)

# Configure CORS for Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "app": "DEALZ Backend", "version": "1.0.0"}

@app.post("/api/chat")
def chat_endpoint(payload: ChatRequest):
    if not payload.message:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")
    
    # Convert Pydantic history objects to standard dictionary format for agent.py
    history_list = [{"role": msg.role, "content": msg.content} for msg in payload.history]
    
    # Get recommendation from AI Shopping Concierge Agent
    recommendation = get_recommendation(payload.message, history_list)
    return recommendation

@app.get("/api/products")
def get_products(
    category: Optional[str] = None,
    query: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    brand: Optional[str] = None
):
    try:
        products = search_products(
            category=category,
            query=query,
            min_price=min_price,
            max_price=max_price,
            brand=brand
        )
        return {"count": len(products), "products": products}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}")
def get_product_details(product_id: str):
    product = get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    reviews = get_product_reviews(product_id)
    deal_score = calculate_deal_score(product, reviews)
    buy_wait = get_buy_or_wait_signal(product)
    summary = heuristic_summarize_reviews(product_id, reviews)
    
    return {
        "product": product,
        "reviews": reviews,
        "deal_score": deal_score,
        "buy_or_wait": buy_wait["signal"],
        "buy_or_wait_reason": buy_wait["reason"],
        "summary": summary
    }

@app.post("/api/compare")
def compare_products(payload: CompareRequest):
    if len(payload.product_ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 product IDs for comparison.")
        
    products_to_compare = []
    for pid in payload.product_ids:
        product = get_product_by_id(pid)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with ID '{pid}' not found.")
            
        reviews = get_product_reviews(pid)
        ds = calculate_deal_score(product, reviews)
        bw = get_buy_or_wait_signal(product)
        summary = heuristic_summarize_reviews(pid, reviews)
        
        products_to_compare.append({
            **product,
            "deal_score": ds,
            "buy_or_wait": bw["signal"],
            "buy_or_wait_reason": bw["reason"],
            "summary": summary
        })
        
    # Generate side-by-side comparison meta analysis
    categories = {p["category"] for p in products_to_compare}
    is_same_category = len(categories) == 1
    
    # Simple algorithm to suggest the best among comparison items
    # Sort items based on Deal Score
    sorted_by_score = sorted(products_to_compare, key=lambda x: x["deal_score"], reverse=True)
    winner = sorted_by_score[0]
    
    analysis_verdict = (
        f"Comparing these {len(products_to_compare)} products, the **{winner['name']}** stands out as the best choice. "
        f"It achieves a Deal Score of {winner['deal_score']}/10 owing to its excellent balance of specs, "
        f"rating ({winner['rating']}/5), and value for money."
    )
    if not is_same_category:
        analysis_verdict += " Note that these items belong to different categories, so your choice will depend on which gadget you need."
        
    return {
        "products": products_to_compare,
        "winner_id": winner["id"],
        "verdict": analysis_verdict,
        "same_category": is_same_category
    }

@app.post("/api/goal-setup")
def build_goal_setup(payload: GoalSetupRequest):
    # Construct a message for agent.py simulating setup build request
    message = f"I want a workstation setup based on: {payload.query}. My budget is ₹{payload.budget}."
    recommendation = get_recommendation(message, [])
    
    if not recommendation.get("is_setup"):
        raise HTTPException(status_code=400, detail="Failed to build setup. Query did not resolve to a setup response.")
        
    return recommendation

if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
