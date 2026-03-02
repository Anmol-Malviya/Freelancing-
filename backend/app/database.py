from pymongo import MongoClient, ASCENDING, TEXT
from pymongo.collection import Collection
from app.config import settings
import structlog

log = structlog.get_logger()

# ─── Client (singleton) ──────────────────────────────────────
client: MongoClient = None
db = None


def connect_db():
    """Called on app startup."""
    global client, db
    try:
        client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[settings.MONGO_DB_NAME]
        # Verify connection
        client.admin.command("ping")
        log.info("mongodb_connected", db=settings.MONGO_DB_NAME)
        _create_indexes()
    except Exception as e:
        log.error("mongodb_connection_failed", error=str(e))
        # Do NOT raise — let uvicorn start so the server is reachable.
        # Requests that need DB will fail gracefully with 503.


def disconnect_db():
    """Called on app shutdown."""
    global client
    if client:
        client.close()
        log.info("mongodb_disconnected")


def get_db():
    return db


# ─── Collection helpers ──────────────────────────────────────
def users_col() -> Collection:
    return db["users"]

def projects_col() -> Collection:
    return db["projects"]

def purchases_col() -> Collection:
    return db["purchases"]

def transactions_col() -> Collection:
    return db["transactions"]

def follows_col() -> Collection:
    return db["follows"]

def ratings_col() -> Collection:
    return db["ratings"]

def comments_col() -> Collection:
    return db["comments"]

def likes_col() -> Collection:
    return db["likes"]

def withdrawals_col() -> Collection:
    return db["withdrawals"]

def processed_webhooks_col() -> Collection:
    return db["processed_webhooks"]

def audit_logs_col() -> Collection:
    return db["audit_logs"]

def otps_col() -> Collection:
    return db["otps"]



# ─── Index creation (idempotent) ─────────────────────────────
def _create_indexes():
    log.info("creating_indexes")

    # users
    users_col().create_index("email", unique=True)

    # projects
    projects_col().create_index("user_id")
    projects_col().create_index("tech_stack")
    projects_col().create_index([("price", ASCENDING), ("created_at", -1)])
    projects_col().create_index([("title", TEXT), ("description", TEXT)])

    # purchases
    purchases_col().create_index("buyer_id")
    purchases_col().create_index("razorpay_payment_id", unique=True, sparse=True)
    purchases_col().create_index([("buyer_id", ASCENDING), ("project_id", ASCENDING)])

    # follows
    follows_col().create_index(
        [("follower_id", ASCENDING), ("following_id", ASCENDING)], unique=True
    )

    # ratings
    ratings_col().create_index(
        [("project_id", ASCENDING), ("user_id", ASCENDING)], unique=True
    )

    # likes
    likes_col().create_index(
        [("project_id", ASCENDING), ("user_id", ASCENDING)], unique=True
    )

    # processed_webhooks (idempotency)
    processed_webhooks_col().create_index("razorpay_event_id", unique=True)
    
    # otps
    otps_col().create_index("email")
    otps_col().create_index("created_at", expireAfterSeconds=300)

    log.info("indexes_created")
