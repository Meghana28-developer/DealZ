import os
import sys
# Ensure the parent directory is in sys.path so 'app' module can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import DB_PATH, BASE_DIR

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    print(f"Initializing database at: {DB_PATH}")
    # Ensure directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create products table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            brand TEXT NOT NULL,
            price REAL NOT NULL,
            rating REAL NOT NULL,
            image_url TEXT,
            specs TEXT, -- JSON string
            historical_prices TEXT -- JSON string list
        )
    """)
    
    # Create reviews table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    
    # Check if empty, then seed
    cursor.execute("SELECT COUNT(*) as count FROM products")
    if cursor.fetchone()["count"] == 0:
        seed_data(conn)
        
    conn.close()

def seed_data(conn):
    print("Seeding database from JSON files...")
    cursor = conn.cursor()
    
    products_path = BASE_DIR / "data" / "products.json"
    reviews_path = BASE_DIR / "data" / "reviews.json"
    
    if products_path.exists():
        with open(products_path, "r", encoding="utf-8") as f:
            products = json.load(f)
            for p in products:
                cursor.execute("""
                    INSERT INTO products (id, name, category, brand, price, rating, image_url, specs, historical_prices)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p["id"],
                    p["name"],
                    p["category"],
                    p["brand"],
                    p["price"],
                    p["rating"],
                    p["image_url"],
                    json.dumps(p["specs"]),
                    json.dumps(p["historical_prices"])
                ))
        print(f"Seeded {len(products)} products.")
        
    if reviews_path.exists():
        with open(reviews_path, "r", encoding="utf-8") as f:
            reviews = json.load(f)
            for r in reviews:
                cursor.execute("""
                    INSERT INTO reviews (id, product_id, user_name, rating, comment, sentiment)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    r["id"],
                    r["product_id"],
                    r["user_name"],
                    r["rating"],
                    r["comment"],
                    r["sentiment"]
                ))
        print(f"Seeded {len(reviews)} reviews.")
        
    conn.commit()

# --- Query Helpers ---

def get_all_products() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        item = dict(r)
        item["specs"] = json.loads(item["specs"])
        item["historical_prices"] = json.loads(item["historical_prices"])
        result.append(item)
    return result

def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    item = dict(row)
    item["specs"] = json.loads(item["specs"])
    item["historical_prices"] = json.loads(item["historical_prices"])
    return item

def get_product_reviews(product_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reviews WHERE product_id = ?", (product_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def search_products(
    category: Optional[str] = None,
    query: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    brand: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "SELECT * FROM products WHERE 1=1"
    params = []
    
    if category:
        sql += " AND category = ?"
        params.append(category.lower())
    if brand:
        sql += " AND LOWER(brand) = ?"
        params.append(brand.lower())
    if min_price is not None:
        sql += " AND price >= ?"
        params.append(min_price)
    if max_price is not None:
        sql += " AND price <= ?"
        params.append(max_price)
    if query:
        sql += " AND (name LIKE ? OR specs LIKE ?)"
        params.append(f"%{query}%")
        params.append(f"%{query}%")
        
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        item = dict(r)
        item["specs"] = json.loads(item["specs"])
        item["historical_prices"] = json.loads(item["historical_prices"])
        result.append(item)
    return result
