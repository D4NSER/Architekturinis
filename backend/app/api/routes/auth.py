from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import authenticate_user
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    email = user_in.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    user = User(
        email=email,
        hashed_password=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        goal=user_in.goal,
        height_cm=user_in.height_cm,
        weight_kg=user_in.weight_kg,
        activity_level=user_in.activity_level,
        dietary_preferences=user_in.dietary_preferences,
        allergies=user_in.allergies,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create user") from exc

    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login(login_in: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = authenticate_user(db, login_in.email.lower(), login_in.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(user.id, expires_delta)
    expires_at = datetime.utcnow() + expires_delta
    return LoginResponse(access_token=access_token, expires_at=expires_at)
