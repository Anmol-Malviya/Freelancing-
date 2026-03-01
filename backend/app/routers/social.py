from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.database import projects_col, ratings_col, comments_col, likes_col
from app.schemas import RatingCreate, CommentCreate
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/projects", tags=["Social"])


# ─── Ratings ─────────────────────────────────────────────────
@router.post("/{project_id}/rate")
async def rate_project(
    project_id: str,
    body: RatingCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = projects_col().find_one({"_id": oid, "is_deleted": False})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Cannot rate own project
    if str(project["user_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot rate your own project")

    now = datetime.utcnow()
    try:
        ratings_col().update_one(
            {"project_id": oid, "user_id": current_user["_id"]},
            {
                "$set": {
                    "score": body.score,
                    "review": body.review,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "project_id": oid,
                    "user_id": current_user["_id"],
                    "created_at": now,
                }
            },
            upsert=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not save rating")

    # Recompute average rating
    pipeline = [
        {"$match": {"project_id": oid}},
        {"$group": {"_id": None, "avg": {"$avg": "$score"}, "count": {"$sum": 1}}},
    ]
    agg = list(ratings_col().aggregate(pipeline))
    avg = round(agg[0]["avg"], 2) if agg else 0.0
    count = agg[0]["count"] if agg else 0

    projects_col().update_one(
        {"_id": oid},
        {"$set": {"average_rating": avg, "rating_count": count}}
    )

    return {"success": True, "data": {"average_rating": avg, "rating_count": count}}


# ─── Comments ─────────────────────────────────────────────────
@router.get("/{project_id}/comments")
async def get_comments(project_id: str, page: int = 1, limit: int = 20):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    skip = (page - 1) * limit
    total = comments_col().count_documents({"project_id": oid, "is_deleted": False})
    docs = list(
        comments_col()
        .find({"project_id": oid, "is_deleted": False})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    return {
        "success": True,
        "data": [
            {
                "id": str(d["_id"]),
                "user_id": str(d["user_id"]),
                "body": d["body"],
                "created_at": d["created_at"],
            }
            for d in docs
        ],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("/{project_id}/comments", status_code=201)
async def add_comment(
    project_id: str,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    if not projects_col().find_one({"_id": oid, "is_deleted": False}):
        raise HTTPException(status_code=404, detail="Project not found")

    now = datetime.utcnow()
    doc = {
        "project_id": oid,
        "user_id": current_user["_id"],
        "body": body.body,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }
    result = comments_col().insert_one(doc)

    return {"success": True, "data": {"id": str(result.inserted_id), "body": body.body}}


@router.delete("/{project_id}/comments/{comment_id}")
async def delete_comment(
    project_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        c_oid = ObjectId(comment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid comment ID")

    comment = comments_col().find_one({"_id": c_oid})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if str(comment["user_id"]) != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your comment")

    comments_col().update_one({"_id": c_oid}, {"$set": {"is_deleted": True}})
    return {"success": True, "data": {"message": "Comment deleted"}}


# ─── Likes ────────────────────────────────────────────────────
@router.post("/{project_id}/like")
async def like_project(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    try:
        likes_col().insert_one({
            "project_id": oid,
            "user_id": current_user["_id"],
            "created_at": datetime.utcnow(),
        })
        projects_col().update_one({"_id": oid}, {"$inc": {"like_count": 1}})
    except Exception:
        raise HTTPException(status_code=400, detail="Already liked")

    return {"success": True, "data": {"message": "Liked"}}


@router.delete("/{project_id}/like")
async def unlike_project(project_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")

    result = likes_col().delete_one({"project_id": oid, "user_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Like not found")

    projects_col().update_one({"_id": oid}, {"$inc": {"like_count": -1}})
    return {"success": True, "data": {"message": "Unliked"}}
