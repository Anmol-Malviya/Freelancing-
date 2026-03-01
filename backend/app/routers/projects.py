from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from bson import ObjectId
from typing import Optional

from app.database import projects_col, purchases_col
from app.schemas import ProjectCreate, ProjectUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


def _serialize(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k not in ("_id", "s3_file_key")}
    d["id"] = str(doc["_id"])
    d["user_id"] = str(doc.get("user_id", ""))
    return d


@router.get("")
async def list_projects(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tech: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    sort: str = Query("newest", regex="^(newest|price_asc|price_desc|popular)$"),
    search: Optional[str] = None,
):
    query = {"is_deleted": False, "is_published": True}

    if tech:
        query["tech_stack"] = {"$in": [t.strip() for t in tech.split(",")]}
    if category:
        query["category"] = category
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
    if search:
        query["$text"] = {"$search": search}

    sort_map = {
        "newest": [("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "popular": [("total_sales", -1)],
    }

    skip = (page - 1) * limit
    total = projects_col().count_documents(query)
    docs = list(
        projects_col()
        .find(query, {"s3_file_key": 0})  # Never expose S3 key
        .sort(sort_map[sort])
        .skip(skip)
        .limit(limit)
    )

    return {
        "success": True,
        "data": [_serialize(d) for d in docs],
        "meta": {"page": page, "limit": limit, "total": total, "pages": -(-total // limit)},
    }


@router.post("", status_code=201)
async def create_project(body: ProjectCreate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Email verification required to list projects")

    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "title": body.title,
        "description": body.description,
        "tech_stack": body.tech_stack,
        "category": body.category,
        "license": body.license,
        "price": body.price,              # paise
        "s3_file_key": body.s3_file_key,
        "image_urls": [],
        "total_sales": 0,
        "average_rating": 0.0,
        "rating_count": 0,
        "like_count": 0,
        "download_count": 0,
        "is_published": True,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }

    result = projects_col().insert_one(doc)
    doc["_id"] = result.inserted_id

    return {"success": True, "data": _serialize(doc)}


@router.get("/{project_id}")
async def get_project(project_id: str):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    doc = projects_col().find_one(
        {"_id": oid, "is_deleted": False},
        {"s3_file_key": 0}  # Never expose S3 key
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"success": True, "data": _serialize(doc)}


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = projects_col().find_one({"_id": oid, "is_deleted": False})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Ownership check
    if project["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your project")

    updates = {k: v for k, v in body.dict().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()

    projects_col().update_one({"_id": oid}, {"$set": updates})
    updated = projects_col().find_one({"_id": oid}, {"s3_file_key": 0})

    return {"success": True, "data": _serialize(updated)}


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = projects_col().find_one({"_id": oid, "is_deleted": False})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["user_id"] != current_user["_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your project")

    # SOFT DELETE — never hard delete (preserves purchase history)
    projects_col().update_one(
        {"_id": oid},
        {"$set": {"is_deleted": True, "is_published": False, "updated_at": datetime.utcnow()}}
    )

    return {"success": True, "data": {"message": "Project deleted"}}
