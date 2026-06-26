import os
import sys
# Ensure the parent directory is in sys.path so 'app' module can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import json
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types as genai_types
from app.config import GEMINI_API_KEY
from app.database import search_products, get_product_reviews, get_all_products

logger = logging.getLogger("dealz_agent")
logging.basicConfig(level=logging.INFO)

# Configure Gemini client
_gemini_client = None
if GEMINI_API_KEY:
    try:
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("Gemini API client initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing Gemini client: {e}")
else:
    logger.warning("No GEMINI_API_KEY found. Running in Offline Rule-Based Mode.")

# --- Heuristic Regex Parser for Fallback Mode ---

def heuristic_extract_requirements(query: str) -> Dict[str, Any]:
    query_lower = query.lower()
    
    # 1. Category extraction
    category = None
    if any(k in query_lower for k in ["laptop", "notebook", "pc"]):
        category = "laptop"
    elif any(k in query_lower for k in ["phone", "mobile", "camera phone", "smartphone"]):
        category = "phone"
    elif any(k in query_lower for k in ["earbud", "anc", "headphone", "buds", "earphone"]):
        category = "earbuds"
    elif any(k in query_lower for k in ["monitor", "display", "screen"]):
        category = "monitor"
    elif any(k in query_lower for k in ["keyboard"]):
        category = "keyboard"
    elif any(k in query_lower for k in ["mouse", "mice"]):
        category = "mouse"
    
    # Detect setups
    is_setup = False
    if any(k in query_lower for k in ["setup", "workstation", "desk setup", "office setup", "complete setup"]):
        is_setup = True
        category = "setup"

    # 2. Budget extraction
    budget = None
    # Match patterns like: under 70,000, under 70000, under 70k, under 1 lakh, 1.5 lakh, etc.
    # Convert 'lakh' or 'k' expressions
    lakh_match = re.search(r'(?:under|below|budget|around|of)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lacs|lac|l)', query_lower)
    k_match = re.search(r'(?:under|below|budget|around|of)?\s*₹?\s*(\d+)\s*(?:k|thousand)', query_lower)
    raw_number_match = re.search(r'(?:under|below|budget|around|of|max|maximum)\s*₹?\s*(\d{4,7})', query_lower)
    
    if lakh_match:
        budget = float(lakh_match.group(1)) * 100000
    elif k_match:
        budget = float(k_match.group(1)) * 1000
    elif raw_number_match:
        budget = float(raw_number_match.group(1))
    
    # 3. Preferences & constraints extraction
    preferences = []
    if "anc" in query_lower:
        preferences.append("Active Noise Cancellation (ANC)")
    if "oled" in query_lower:
        preferences.append("OLED Display")
    if "gaming" in query_lower or "game" in query_lower:
        preferences.append("Gaming Specs")
    if "ai" in query_lower or "coding" in query_lower or "developer" in query_lower:
        preferences.append("Coding/AI Development")
    if "wireless" in query_lower:
        preferences.append("Wireless Connectivity")
    if "battery" in query_lower:
        preferences.append("Long Battery Life")
    if "camera" in query_lower:
        preferences.append("Premium Camera")
        
    return {
        "category": category,
        "budget": budget,
        "preferences": preferences,
        "is_setup": is_setup
    }

# --- Offline Scoring and Summarizer Heuristics ---

def calculate_deal_score(product: Dict[str, Any], reviews: List[Dict[str, Any]]) -> float:
    # 1. Rating contribution: up to 5 points (rating / 5 * 5)
    rating_score = (product["rating"] / 5.0) * 5.0
    
    # 2. Price competitiveness (historical values): up to 3 points
    # Compare current price to history. Lower is better.
    prices = product.get("historical_prices", [])
    if len(prices) > 1:
        highest = max(prices)
        lowest = min(prices)
        current = product["price"]
        if highest > lowest:
            # If current price is lowest, get 3 points. If highest, 0 points.
            price_comp = ((highest - current) / (highest - lowest)) * 3.0
            price_comp = max(0.0, min(3.0, price_comp))
        else:
            price_comp = 1.5
    else:
        price_comp = 1.5
        
    # 3. Sentiment factor: up to 2 points
    # Ratio of positive reviews to total reviews
    if reviews:
        pos_count = sum(1 for r in reviews if r["sentiment"] == "positive")
        neg_count = sum(1 for r in reviews if r["sentiment"] == "negative")
        sentiment_ratio = pos_count / len(reviews)
        sentiment_score = sentiment_ratio * 2.0
    else:
        sentiment_score = 1.0
        
    score = rating_score + price_comp + sentiment_score
    return round(max(1.0, min(10.0, score)), 1)

def get_buy_or_wait_signal(product: Dict[str, Any]) -> Dict[str, str]:
    prices = product.get("historical_prices", [])
    if not prices:
        return {"signal": "BUY", "reason": "No historical pricing data available to suggest waiting. Current price is fair."}
    
    current = product["price"]
    lowest = min(prices)
    highest = max(prices)
    
    if current <= lowest:
        return {
            "signal": "BUY NOW",
            "reason": f"This product is at its lowest price in recent months (₹{int(current):,}). Highly recommended to purchase now."
        }
    elif current >= highest:
        return {
            "signal": "WAIT",
            "reason": f"Price is currently at its historical peak (₹{int(current):,}). Recommend waiting for a sale/price drop."
        }
    else:
        # Price is in between
        avg_price = sum(prices) / len(prices)
        if current < avg_price:
            return {
                "signal": "BUY",
                "reason": f"Price (₹{int(current):,}) is below the recent average of ₹{int(avg_price):,}. Good time to buy."
            }
        else:
            return {
                "signal": "WAIT/BUY",
                "reason": f"Price is slightly higher than average. If you need it urgently, buy; otherwise, wait for a minor discount."
            }

def heuristic_summarize_reviews(product_id: str, reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not reviews:
        return {
            "pros": ["Good rating"],
            "cons": ["No negative comments available"],
            "complaints": "No complaints found.",
            "best_for": "General users",
            "avoid_if": "Specific features are missing"
        }
        
    pos_reviews = [r for r in reviews if r["sentiment"] == "positive"]
    neg_reviews = [r for r in reviews if r["sentiment"] == "negative"]
    neut_reviews = [r for r in reviews if r["sentiment"] == "neutral"]
    
    # Generate generic summaries from reviews text
    # Extract short pros and cons
    pros = []
    cons = []
    
    # Extracting some snippets or using deterministic rules per product
    if product_id == "laptop-1":
        pros = ["Exceptional performance (Ryzen 9)", "Beautiful 120Hz OLED screen", "Great keyboard and build"]
        cons = ["Runs hot under load", "Fans get loud"]
        best_for = "Software development, AI coding, content creation, and gaming"
        avoid_if = "You need absolute silence or 10+ hours battery life"
    elif product_id == "laptop-2":
        pros = ["Extremely affordable under 40k", "Comes with fast SSD", "Comfortable keyboard for general work"]
        cons = ["Cheap plastic build quality", "Washed out display with poor viewing angles"]
        best_for = "Students, browsing, and light office work"
        avoid_if = "You need to compile big code bases, edit videos, or play heavy games"
    elif product_id == "laptop-3":
        pros = ["Premium OLED display at budget pricing", "Lightweight (1.25kg)", "16GB RAM is excellent for coding"]
        cons = ["Very weak speakers", "Chassis gets warm near screen bezel"]
        best_for = "Programmers, writers, and students wanting a premium screen on a budget"
        avoid_if = "You rely heavily on laptop speakers or require dedicated graphics"
    elif product_id == "laptop-4":
        pros = ["Legendary battery life (15+ hours)", "Completely fanless and silent", "Premium aluminum build"]
        cons = ["Only 8GB RAM in base model", "Small 256GB SSD storage"]
        best_for = "Professionals on the move, students, and developers working on cloud-based setups"
        avoid_if = "You run local virtual machines, docker containers, or need dual external monitors natively"
    elif product_id == "laptop-5":
        pros = ["Dedicated RTX 3050 GPU", "FHD 144Hz high refresh rate screen", "Full-sized keyboard with numpad"]
        cons = ["Bulky and heavy design (2.46kg)", "Very short battery life (3 hours)"]
        best_for = "Casual gamers and budget 3D rendering projects"
        avoid_if = "You travel frequently or require a lightweight work machine"
    elif product_id == "monitor-1":
        pros = ["Wide 21:9 display screen area", "Great value IPS panel", "Smooth FreeSync integration"]
        cons = ["Low vertical resolution (1080p)", "Basic stand with no height adjust"]
        best_for = "Multitasking office work and split-screen documentation"
        avoid_if = "You demand crisp text density or high refresh rates for gaming"
    elif product_id == "monitor-3":
        pros = ["Immense 34\" curved ultra-WQHD screen", "Single-cable USB-C with 90W laptop charging", "Built-in KVM switch"]
        cons = ["VA panel viewing angles are average", "Huge stand takes up a lot of desk depth"]
        best_for = "Developers and stock traders who need massive workspace"
        avoid_if = "You have a small desk or play highly competitive fast-paced FPS games"
    elif product_id == "mouse-1":
        pros = ["Satisfying ergonomic grip", "Legendary infinite horizontal scroll wheel", "Connects to 3 devices simultaneously"]
        cons = ["Large and heavy for small hands", "Expensive price point"]
        best_for = "Software developers, writers, and digital creators"
        avoid_if = "You prefer lightweight gaming mice or have small hands"
    elif product_id == "phone-4":
        pros = ["Clean, bloatware-free Nothing OS", "Unique aesthetic with glyph backlights", "Great symmetric display bezels"]
        cons = ["Does not ship with a wall charger", "Slow charging speeds compared to competitors"]
        best_for = "Users wanting a clean, stylish, bloatware-free Android UI"
        avoid_if = "You want extreme fast-charging or a telephoto zoom lens"
    elif product_id == "phone-5":
        pros = ["Console-grade A17 Pro performance", "Ultra-lightweight titanium body", "Industry-leading video recording"]
        cons = ["Very high price tag", "Heats up slightly during heavy gaming"]
        best_for = "Power users, vloggers, and enthusiasts"
        avoid_if = "You are on a tight budget or upgrading from an iPhone 14 Pro"
    elif product_id == "earbuds-2":
        pros = ["Unmatched sound quality for price (dual drivers)", "Great active noise cancellation (50dB)", "Hi-Res LDAC support"]
        cons = ["Glossy case scratches easily", "Average mic performance in high wind"]
        best_for = "Audiophiles looking for rich audio on a budget under ₹5,000"
        avoid_if = "You require premium call quality in noisy environments"
    else:
        # Fallback list compilation
        pros = [r["comment"][:40] + "..." for r in pos_reviews[:2]] if pos_reviews else ["Decent build"]
        cons = [r["comment"][:40] + "..." for r in neg_reviews[:2]] if neg_reviews else ["Average design"]
        best_for = "General everyday usage"
        avoid_if = "Highly demanding expert tasks"

    complaints = neg_reviews[0]["comment"] if neg_reviews else "No major complaints reported."
    
    return {
        "pros": pros,
        "cons": cons,
        "complaints": complaints,
        "best_for": best_for,
        "avoid_if": avoid_if
    }

# --- Offline Recommendations Engine ---

def offline_get_recommendation(query: str, extracted: Dict[str, Any]) -> Dict[str, Any]:
    category = extracted["category"]
    budget = extracted["budget"]
    preferences = extracted["preferences"]
    is_setup = extracted["is_setup"]
    
    # 1. Handle Setup building
    if is_setup or category == "setup":
        budget = budget or 100000.0 # Default to 1 Lakh if unspecified
        
        # We need: Laptop, Monitor, Keyboard, Mouse
        laptops = sorted(search_products(category="laptop"), key=lambda x: x["price"])
        monitors = sorted(search_products(category="monitor"), key=lambda x: x["price"])
        keyboards = sorted(search_products(category="keyboard"), key=lambda x: x["price"])
        mice = sorted(search_products(category="mouse"), key=lambda x: x["price"])
        
        best_combo = None
        best_combo_cost = 0
        
        # Simple search for a combination that maximizes price but stays under budget
        # We want to prioritize the laptop, then monitor, then keyboard, then mouse
        for l in laptops:
            for mon in monitors:
                for kb in keyboards:
                    for ms in mice:
                        cost = l["price"] + mon["price"] + kb["price"] + ms["price"]
                        if cost <= budget:
                            if best_combo is None or cost > best_combo_cost:
                                best_combo = (l, mon, kb, ms)
                                best_combo_cost = cost
                                
        if best_combo:
            l, mon, kb, ms = best_combo
            
            # Enrich items with deal scores
            items = {}
            for item, cat_name in [(l, "laptop"), (mon, "monitor"), (kb, "keyboard"), (ms, "mouse")]:
                revs = get_product_reviews(item["id"])
                ds = calculate_deal_score(item, revs)
                bw = get_buy_or_wait_signal(item)
                summary = heuristic_summarize_reviews(item["id"], revs)
                items[cat_name] = {
                    **item,
                    "deal_score": ds,
                    "pros": summary["pros"],
                    "cons": summary["cons"],
                    "buy_or_wait": bw["signal"],
                    "buy_or_wait_reason": bw["reason"],
                    "why_recommended": f"Selected as the optimal {cat_name} for your tech package, balancing price and features."
                }
            
            avg_rating = sum(item["rating"] for item in [l, mon, kb, ms]) / 4
            overall_deal_score = round((avg_rating / 5.0) * 8.0 + 2.0, 1)
            
            reasoning = (
                f"I have built a complete, high-productivity setup for you within your ₹{int(budget):,} budget. "
                f"The core of the setup is the {l['name']} (₹{int(l['price']):,}), which offers great performance. "
                f"It is paired with the {mon['name']} (₹{int(mon['price']):,}) for ample screen workspace. "
                f"For input, I selected the mechanical {kb['name']} (₹{int(kb['price']):,}) and the precise {ms['name']} (₹{int(ms['price']):,}). "
                f"This entire bundle costs ₹{int(best_combo_cost):,}, leaving you with a buffer of ₹{int(budget - best_combo_cost):,}."
            )
            
            return {
                "response_text": reasoning,
                "category": "setup",
                "budget": budget,
                "preferences": preferences,
                "products": list(items.values()),
                "alternatives": [],
                "is_setup": True,
                "setup_details": {
                    "total_price": best_combo_cost,
                    "budget": budget,
                    "items": items,
                    "reasoning": reasoning,
                    "deal_score": overall_deal_score
                }
            }
        else:
            return {
                "response_text": "I tried to build a setup within your budget, but couldn't find a valid combination of a Laptop, Monitor, Keyboard, and Mouse that fits under the limit. Try increasing the budget or buying items individually.",
                "category": "setup",
                "budget": budget,
                "preferences": preferences,
                "products": [],
                "alternatives": [],
                "is_setup": True,
                "setup_details": None
            }

    # 2. Handle Single Product Category Search
    candidates = search_products(category=category) if category else get_all_products()
    
    # Filter by budget
    if budget:
        candidates = [c for c in candidates if c["price"] <= budget]
        
    if not candidates:
        return {
            "response_text": f"I couldn't find any products in my dataset that match your budget constraints (under ₹{int(budget or 0):,}). Please try raising your budget limit or expanding your search requirements.",
            "category": category,
            "budget": budget,
            "preferences": preferences,
            "products": [],
            "alternatives": [],
            "is_setup": False,
            "setup_details": None
        }

    # Rank candidates by scoring
    scored_candidates = []
    for c in candidates:
        revs = get_product_reviews(c["id"])
        ds = calculate_deal_score(c, revs)
        bw = get_buy_or_wait_signal(c)
        summary = heuristic_summarize_reviews(c["id"], revs)
        
        scored_candidates.append({
            **c,
            "deal_score": ds,
            "pros": summary["pros"],
            "cons": summary["cons"],
            "why_recommended": f"Fits your budget constraints and offers excellent value in the {c['category']} category. Has a high user rating of {c['rating']}/5.",
            "buy_or_wait": bw["signal"],
            "buy_or_wait_reason": bw["reason"],
            "summary": summary
        })
        
    # Sort by Deal Score descending
    scored_candidates = sorted(scored_candidates, key=lambda x: x["deal_score"], reverse=True)
    
    recommended = scored_candidates[0]
    
    # Identify alternatives (items in same category or adjacent pricing)
    alternatives = []
    for c in scored_candidates[1:3]:
        alternatives.append({
            "id": c["id"],
            "name": c["name"],
            "price": c["price"],
            "rating": c["rating"],
            "deal_score": c["deal_score"],
            "specs": c["specs"],
            "why_recommended": f"A good alternative option if you prefer the {c['brand']} brand.",
            "trade_off": "Cheaper but has fewer specs" if c["price"] < recommended["price"] else "More premium but costs slightly more."
        })
        
    pref_text = f" with preferences for {', '.join(preferences)}" if preferences else ""
    response_text = (
        f"Based on your request, my top recommendation is the **{recommended['name']}** in the {recommended['category']} category. "
        f"It offers a great price of ₹{int(recommended['price']):,} and carries an outstanding user rating of {recommended['rating']}/5, "
        f"resulting in a Deal Score of **{recommended['deal_score']}/10**.\n\n"
        f"Here is why it is recommended:\n- **Pros:** {', '.join(recommended['pros'][:2])}.\n"
        f"- **Verdict:** {recommended['buy_or_wait_reason']}"
    )

    return {
        "response_text": response_text,
        "category": category,
        "budget": budget,
        "preferences": preferences,
        "products": [recommended],
        "alternatives": alternatives,
        "is_setup": False,
        "setup_details": None
    }

# --- Gemini API RAG Concierge Engine ---

def get_recommendation(query: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    if chat_history is None:
        chat_history = []
        
    # Always extract requirements first using offline code to focus database queries
    extracted = heuristic_extract_requirements(query)
    
    # If Gemini is NOT configured, run offline logic
    if not GEMINI_API_KEY:
        return offline_get_recommendation(query, extracted)
        
    try:
        # 1. Fetch relevant context data from database
        category = extracted["category"]
        is_setup = extracted["is_setup"]
        
        # If it's a setup, pull all products to build bundles. Otherwise, pull relevant categories.
        if is_setup or category == "setup" or not category:
            db_products = get_all_products()
        else:
            db_products = search_products(category=category)
            
        # Enrich products context with their reviews for Gemini to digest
        products_context = []
        for p in db_products:
            revs = get_product_reviews(p["id"])
            p_copy = dict(p)
            p_copy["reviews"] = [
                {"rating": r["rating"], "comment": r["comment"], "sentiment": r["sentiment"]}
                for r in revs
            ]
            products_context.append(p_copy)
            
        # 2. Build the LLM prompt
        history_formatted = ""
        for h in chat_history[-6:]:  # include last 3 exchanges (6 messages)
            role = "User" if h["role"] == "user" else "Assistant"
            history_formatted += f"{role}: {h['content']}\n"
            
        prompt = f"""
You are "DEALZ - Your Personal AI Shopping Concierge", a highly sophisticated, expert shopping agent.
Your goal is to parse the user's query, search the available database, and generate structured recommendations.

Here is the conversation history:
{history_formatted}

User query: "{query}"

Here is the database of products (containing specifications, historical pricing, and reviews):
{json.dumps(products_context, indent=2)}

Please perform the following operations:
1. Parse the user query and extract:
   - "category": (one of: laptop, phone, earbuds, monitor, keyboard, mouse, or setup)
   - "budget": integer (extracted numeric budget constraint, or null)
   - "preferences": list of strings (desired qualities e.g. "ANC", "OLED", "Gaming")
2. Select the absolute best product(s) from the database that match the budget and requirements. 
   - If the user wants a setup (e.g. laptop setup, work setup, budget is ₹1 Lakh), you must select a combination of exactly 4 items: one laptop, one monitor, one keyboard, and one mouse. Total price must not exceed the budget.
   - For regular category queries, select the best matching product as the primary recommendation.
3. Calculate a "deal_score" out of 10 for the recommended product(s). Take into count:
   - Rating and volume of reviews
   - Price competitiveness (is the current price lower than its historical prices?)
   - Features & Value for money
4. Analyze the reviews to extract:
   - "pros": list of 3 concise pros
   - "cons": list of 2-3 concise cons
   - "buy_or_wait": "BUY NOW", "BUY", "WAIT", or "WAIT/BUY" based on the pricing trend
   - "buy_or_wait_reason": explanation of price history trend
   - "why_recommended": explanation of why it was chosen over others
5. Identify 1-2 "alternatives" from the remaining products in the database and specify their "trade_off" compared to the recommendation.
6. Write a friendly, professional, conversational "response_text" detailing your findings, outlining the recommended choices, and explaining your logical reasoning.

Return the response EXACTLY as a JSON object with this exact JSON structure:
{{
  "response_text": "Conversational explanation...",
  "category": "laptop",
  "budget": 70000,
  "preferences": ["coding", "OLED"],
  "products": [
    {{
      "id": "product-id",
      "name": "Product Name",
      "price": 65000,
      "rating": 4.5,
      "deal_score": 8.7,
      "image_url": "url",
      "specs": {{}},
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "why_recommended": "reasoning...",
      "buy_or_wait": "BUY NOW",
      "buy_or_wait_reason": "Price is at lowest..."
    }}
  ],
  "alternatives": [
    {{
      "id": "alt-id",
      "name": "Alt Product Name",
      "price": 54000,
      "rating": 4.3,
      "deal_score": 7.9,
      "specs": {{}},
      "why_recommended": "Reason...",
      "trade_off": "Cheaper but has no OLED display"
    }}
  ],
  "is_setup": false,
  "setup_details": null // OR if is_setup is true, format as:
  // {{
  //   "total_price": 93300,
  //   "budget": 100000,
  //   "items": {{ "laptop": {{...}}, "monitor": {{...}}, "keyboard": {{...}}, "mouse": {{...}} }},
  //   "reasoning": "Why this setup...",
  //   "deal_score": 8.9
  // }}
}}
"""
        # Call Gemini Model using new google.genai client
        response = _gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # Parse output
        raw_json = response.text.strip()
        # Clean markdown codeblocks if any
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:]
        if raw_json.endswith("```"):
            raw_json = raw_json[:-3]
            
        data = json.loads(raw_json)
        return data
        
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}. Falling back to rule-based engine.")
        return offline_get_recommendation(query, extracted)
