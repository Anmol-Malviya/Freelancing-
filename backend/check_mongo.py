"""
Quick MongoDB connection diagnostic.
Run from the backend/ directory:  python check_mongo.py
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os, sys

load_dotenv(".env")

uri     = os.getenv("MONGO_URI", "")
db_name = os.getenv("MONGO_DB_NAME", "devmarket")

print("=" * 55)
print("  MongoDB Connection Check")
print("=" * 55)
print(f"  URI      : {uri[:45]}{'...' if len(uri) > 45 else ''}")
print(f"  Database : {db_name}")
print("-" * 55)

if not uri:
    print("[FAIL] MONGO_URI is empty — check your .env file!")
    sys.exit(1)

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    # This actually forces a real network call
    client.admin.command("ping")
    print("[OK]   Ping succeeded — Atlas is reachable!")

    db = client[db_name]
    collections = db.list_collection_names()
    if collections:
        print(f"[OK]   Collections found: {collections}")
        # Row counts for key collections
        for col_name in ["users", "projects", "purchases"]:
            if col_name in collections:
                count = db[col_name].count_documents({})
                print(f"         {col_name}: {count} document(s)")
    else:
        print("[INFO] No collections yet — they will be created on first write.")

    client.close()
    print("-" * 55)
    print("[PASS] MongoDB is connected and healthy.")

except Exception as e:
    print(f"[FAIL] Connection error: {e}")
    print()
    print("Common fixes:")
    print("  1. Check MONGO_URI in .env (user/password correct?)")
    print("  2. Whitelist your IP in Atlas → Network Access → Add IP")
    print("  3. Check cluster name in the URI matches your Atlas cluster")
    sys.exit(1)
