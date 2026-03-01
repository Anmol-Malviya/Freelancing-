from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from datetime import datetime
from bson import ObjectId
from typing import Optional
import cloudinary.uploader
import structlog

from app.database import projects_col, purchases_col
from app.schemas import ProjectCreate, ProjectUpdate
from app.auth import get_current_user
from app.config import settings

log = structlog.get_logger()

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])

# Max ZIP size in bytes (Cloudinary free plan = 10MB for raw files)
MAX_UPLOAD_MB = 10
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


def _serialize(doc: dict) -> dict:
    d = {k: v for k, v in doc.items() if k not in ("_id", "cloudinary_file_id")}
    d["id"] = str(doc["_id"])
    d["user_id"] = str(doc.get("user_id", ""))
    return d


# ─── Upload ZIP file to Cloudinary ────────────────────────────
@router.post("/upload-file")
async def upload_project_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a ZIP file to Cloudinary. Returns the file ID and URL."""
    import io
    import re

    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_extensions = (".zip", ".rar", ".tar.gz", ".7z", ".gz")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Only archive files are allowed: {', '.join(allowed_extensions)}"
        )

    # Read and check size
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(content) / 1024 / 1024:.1f}MB). Max size: {MAX_UPLOAD_MB}MB"
        )

    # Sanitize filename for Cloudinary public_id
    safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
    ts = int(datetime.utcnow().timestamp())
    public_id = f"{str(current_user['_id'])}_{ts}_{safe_name}"

    # Debug: log Cloudinary config
    log.info("cloudinary_upload_attempt",
             cloud=settings.CLOUDINARY_CLOUD_NAME,
             key=settings.CLOUDINARY_API_KEY[:6] + "..." if settings.CLOUDINARY_API_KEY else "(empty)",
             file_size=len(content),
             public_id=public_id)

    try:
        # Wrap bytes in BytesIO for Cloudinary upload
        file_stream = io.BytesIO(content)

        # Upload to Cloudinary as raw file
        result = cloudinary.uploader.upload(
            file_stream,
            resource_type="raw",
            folder="devmarket/projects",
            public_id=public_id,
            overwrite=False,
        )

        log.info("file_uploaded", public_id=result["public_id"], size=len(content))

        return {
            "success": True,
            "data": {
                "file_id": result["public_id"],
                "file_url": result["secure_url"],
                "file_name": file.filename,
                "file_size": len(content),
            },
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        log.error("cloudinary_upload_failed", error=str(e), traceback=tb)
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


# ─── Standalone Image Upload (For project creation flow) ───────
@router.post("/upload-image")
async def upload_standalone_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a screenshot/image. Returns the image URL to be used in project creation."""
    # Validate image type
    allowed = (".png", ".jpg", ".jpeg", ".webp", ".gif")
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(status_code=400, detail=f"Only images allowed: {', '.join(allowed)}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB max for images
        raise HTTPException(status_code=400, detail="Image too large. Max 5MB.")

    import re
    safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
    ts = int(datetime.utcnow().timestamp())
    public_id = f"img_{str(current_user['_id'])}_{ts}_{safe_name}"

    try:
        import io
        file_stream = io.BytesIO(content)

        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file_stream,
            resource_type="image",
            folder="devmarket/screenshots",
            public_id=public_id,
            transformation=[{"width": 1200, "crop": "limit", "quality": "auto"}],
        )

        return {
            "success": True,
            "data": {
                "image_url": result["secure_url"],
            },
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        log.error("cloudinary_image_upload_failed", error=str(e), traceback=tb)
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


# ─── Upload project screenshot to Cloudinary ─────────────────
@router.post("/{project_id}/upload-image")
async def upload_project_image(
    project_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a screenshot/image for a project."""
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = projects_col().find_one({"_id": oid, "is_deleted": False})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your project")

    # Validate image type
    allowed = (".png", ".jpg", ".jpeg", ".webp", ".gif")
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(status_code=400, detail=f"Only images allowed: {', '.join(allowed)}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB max for images
        raise HTTPException(status_code=400, detail="Image too large. Max 5MB.")

    try:
        import io
        file_stream = io.BytesIO(content)

        result = cloudinary.uploader.upload(
            file_stream,
            resource_type="image",
            folder="devmarket/screenshots",
            public_id=f"{project_id}_{int(datetime.utcnow().timestamp())}",
            transformation=[{"width": 1200, "crop": "limit", "quality": "auto"}],
        )

        # Add URL to project's image_urls array
        projects_col().update_one(
            {"_id": oid},
            {"$push": {"image_urls": result["secure_url"]}}
        )

        return {
            "success": True,
            "data": {
                "image_url": result["secure_url"],
            },
        }
    except Exception as e:
        log.error("image_upload_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Image upload failed.")


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
        .find(query, {"cloudinary_file_id": 0})  # Never expose file ID
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
    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "title": body.title,
        "description": body.description,
        "tech_stack": body.tech_stack,
        "category": body.category,
        "license": body.license,
        "price": body.price,              # paise
        "cloudinary_file_id": body.s3_file_key,  # Now stores Cloudinary public_id
        "file_url": body.file_url if hasattr(body, 'file_url') else "",
        "live_url": body.live_url if hasattr(body, 'live_url') else "",
        "github_url": body.github_url if hasattr(body, 'github_url') else "",
        "image_urls": body.image_urls if hasattr(body, 'image_urls') else [],
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
        {"cloudinary_file_id": 0}  # Never expose file ID
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
    updated = projects_col().find_one({"_id": oid}, {"cloudinary_file_id": 0})

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
