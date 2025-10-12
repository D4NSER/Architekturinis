from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserProfile, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

MEDIA_ROOT = Path(__file__).resolve().parents[3] / "media" / "profile_pictures"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)


@router.get("/me", response_model=UserProfile)
def read_me(current_user: User = Depends(get_current_user)) -> UserProfile:
    return current_user


@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserRead)
def upload_avatar(
    file: Annotated[UploadFile, File(..., description="Profile image (PNG or JPEG)")],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if file.content_type not in {"image/png", "image/jpeg"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PNG and JPEG images are allowed")

    extension = ".png" if file.content_type == "image/png" else ".jpg"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{current_user.id}_{timestamp}{extension}"
    destination = MEDIA_ROOT / filename

    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    relative_path = f"/media/profile_pictures/{filename}"
    current_user.avatar_url = relative_path

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user
