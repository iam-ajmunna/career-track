from __future__ import annotations

import json
import re
import uuid
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai import local_ai
from .config import get_settings
from .cv import extract_cv_text
from .db import Base, engine, get_db
from .discovery import discover
from .models import Profile, Scholarship, SearchRun, User, UserScholarship
from .security import (
    create_access_token,
    get_current_user,
    hash_password,
    validate_email,
    validate_password,
    verify_password,
)

settings = get_settings()
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name, version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


class AuthIn(BaseModel):
    email: str
    password: str
    display_name: str = ""


class LoginIn(BaseModel):
    email: str
    password: str


class ProfilePatch(BaseModel):
    full_name: str | None = None
    nationality: str | None = None
    residence_country: str | None = None
    degree: str | None = None
    university: str | None = None
    cgpa: str | None = None
    graduation_year: str | None = None
    fields: list[str] | None = None
    skills: list[str] | None = None
    publications: list[Any] | None = None
    experience: list[Any] | None = None
    achievements: list[Any] | None = None
    target_degrees: list[str] | None = None
    target_countries: list[str] | None = None
    funding_required: bool | None = None
    english_test: str | None = None
    notes: str | None = None


class SearchIn(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    max_fit_analysis: int = Field(default=8, ge=1, le=15)


class ScholarshipPatch(BaseModel):
    status: str | None = None
    saved: bool | None = None
    notes: str | None = None
    checklist: list[Any] | None = None


ALLOWED_STATUSES = {"discovered", "saved", "preparing", "applying", "applied", "interview", "awarded", "rejected", "archived"}


def get_or_create_profile(db: Session, user: User) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if not profile:
        profile = Profile(user_id=user.id, full_name=user.display_name)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def profile_dict(profile: Profile) -> dict[str, Any]:
    return {
        "id": profile.id,
        "full_name": profile.full_name,
        "nationality": profile.nationality,
        "residence_country": profile.residence_country,
        "degree": profile.degree,
        "university": profile.university,
        "cgpa": profile.cgpa,
        "graduation_year": profile.graduation_year,
        "fields": profile.fields or [],
        "skills": profile.skills or [],
        "publications": profile.publications or [],
        "experience": profile.experience or [],
        "achievements": profile.achievements or [],
        "target_degrees": profile.target_degrees or [],
        "target_countries": profile.target_countries or [],
        "funding_required": profile.funding_required,
        "english_test": profile.english_test,
        "notes": profile.notes,
        "cv_filename": profile.cv_filename,
        "has_cv": bool(profile.cv_text),
        "updated_at": profile.updated_at,
    }


def scholarship_dict(s: Scholarship, us: UserScholarship | None = None) -> dict[str, Any]:
    result = {
        "id": s.id,
        "title": s.title,
        "provider": s.provider,
        "country": s.country,
        "degree_level": s.degree_level,
        "funding": s.funding,
        "deadline": s.deadline,
        "eligibility": s.eligibility,
        "description": s.description,
        "url": s.url,
        "source_domain": s.source_domain,
        "verified_at": s.verified_at,
    }
    if us:
        result["tracking"] = {
            "status": us.status,
            "saved": us.saved,
            "fit_score": us.fit_score,
            "fit_summary": us.fit_summary,
            "strengths": us.strengths or [],
            "gaps": us.gaps or [],
            "checklist": us.checklist or [],
            "notes": us.notes,
            "updated_at": us.updated_at,
        }
    return result


def scholarship_for_ai(s: Scholarship) -> dict[str, Any]:
    return {
        "title": s.title,
        "provider": s.provider,
        "country": s.country,
        "degree_level": s.degree_level,
        "funding": s.funding,
        "deadline": s.deadline,
        "eligibility": s.eligibility,
        "description": s.description,
        "url": s.url,
    }


def clean_list(value: Any, limit: int = 60) -> list:
    if not isinstance(value, list):
        return []
    return value[:limit]


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "ai_available": await local_ai.available(), "version": "2.0.0"}


@app.post("/api/auth/register")
def register(payload: AuthIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    email = validate_email(payload.email)
    validate_password(payload.password)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip()[:120],
    )
    db.add(user)
    db.flush()
    db.add(Profile(user_id=user.id, full_name=user.display_name))
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(user.id), "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}


@app.post("/api/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    email = validate_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"token": create_access_token(user.id), "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}


@app.get("/api/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    profile = get_or_create_profile(db, user)
    return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}, "profile": profile_dict(profile)}


@app.get("/api/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    return profile_dict(get_or_create_profile(db, user))


@app.put("/api/profile")
def update_profile(payload: ProfilePatch, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    profile = get_or_create_profile(db, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if isinstance(value, str):
            value = value.strip()
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile_dict(profile)


@app.post("/api/profile/cv")
async def upload_cv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    filename = Path(file.filename or "cv").name
    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"CV must be smaller than {settings.max_upload_mb} MB.")

    try:
        text = extract_cv_text(filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    safe_suffix = Path(filename).suffix.lower()
    stored_name = f"{user.id}-{uuid.uuid4().hex}{safe_suffix}"
    (settings.upload_path / stored_name).write_bytes(content)

    profile = get_or_create_profile(db, user)
    profile.cv_text = text
    profile.cv_filename = filename

    extracted = await local_ai.extract_profile(text)
    list_fields = {"fields", "skills", "publications", "experience", "achievements"}
    scalar_fields = {"full_name", "nationality", "residence_country", "degree", "university", "cgpa", "graduation_year"}

    for key in scalar_fields:
        current = getattr(profile, key, "")
        candidate = extracted.get(key)
        if not current and isinstance(candidate, str) and candidate.strip():
            setattr(profile, key, candidate.strip()[:220])

    for key in list_fields:
        current = getattr(profile, key, []) or []
        candidate = clean_list(extracted.get(key))
        if not current and candidate:
            setattr(profile, key, candidate)

    db.commit()
    db.refresh(profile)

    return {
        "profile": profile_dict(profile),
        "extracted": extracted,
        "text_chars": len(text),
        "ai_available": await local_ai.available(),
    }


@app.get("/api/scholarships")
def list_scholarships(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Scholarship, UserScholarship)
        .join(UserScholarship, UserScholarship.scholarship_id == Scholarship.id)
        .where(UserScholarship.user_id == user.id)
        .order_by(UserScholarship.fit_score.desc(), Scholarship.discovered_at.desc())
    ).all()
    return [scholarship_dict(s, us) for s, us in rows]


@app.post("/api/discovery/search")
async def search_scholarships(
    payload: SearchIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    profile = get_or_create_profile(db, user)
    p_dict = profile_dict(profile)

    opportunities = await discover(p_dict, payload.query)
    results: list[dict[str, Any]] = []

    for index, data in enumerate(opportunities):
        scholarship = db.scalar(select(Scholarship).where(Scholarship.fingerprint == data["fingerprint"]))
        if scholarship:
            for key in ("title", "provider", "country", "degree_level", "funding", "deadline", "eligibility", "description", "url", "source_domain", "verified_at"):
                setattr(scholarship, key, data[key])
        else:
            scholarship = Scholarship(**data)
            db.add(scholarship)
            db.flush()

        link = db.scalar(
            select(UserScholarship).where(
                UserScholarship.user_id == user.id,
                UserScholarship.scholarship_id == scholarship.id,
            )
        )
        if not link:
            link = UserScholarship(user_id=user.id, scholarship_id=scholarship.id)
            db.add(link)
            db.flush()

        if index < payload.max_fit_analysis:
            fit = await local_ai.fit_analysis(p_dict, scholarship_for_ai(scholarship))
            link.fit_score = float(fit.get("score", 0))
            link.fit_summary = str(fit.get("summary", ""))
            link.strengths = clean_list(fit.get("strengths"), 20)
            link.gaps = clean_list(fit.get("gaps"), 20)
            suggested = clean_list(fit.get("checklist"), 20)
            if suggested and not link.checklist:
                link.checklist = [{"label": str(item), "done": False} for item in suggested]

        results.append(scholarship_dict(scholarship, link))

    db.add(SearchRun(user_id=user.id, query=payload.query, result_count=len(results)))
    db.commit()
    return {"query": payload.query, "count": len(results), "results": results, "ai_available": await local_ai.available()}


@app.post("/api/scholarships/{scholarship_id}/analyze")
async def analyze_fit(
    scholarship_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    profile = get_or_create_profile(db, user)
    scholarship = db.get(Scholarship, scholarship_id)
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship not found.")

    link = db.scalar(
        select(UserScholarship).where(
            UserScholarship.user_id == user.id,
            UserScholarship.scholarship_id == scholarship_id,
        )
    )
    if not link:
        link = UserScholarship(user_id=user.id, scholarship_id=scholarship_id)
        db.add(link)

    fit = await local_ai.fit_analysis(profile_dict(profile), scholarship_for_ai(scholarship))
    link.fit_score = float(fit.get("score", 0))
    link.fit_summary = str(fit.get("summary", ""))
    link.strengths = clean_list(fit.get("strengths"), 20)
    link.gaps = clean_list(fit.get("gaps"), 20)
    suggested = clean_list(fit.get("checklist"), 20)
    if suggested:
        link.checklist = [{"label": str(item), "done": False} for item in suggested]
    db.commit()
    db.refresh(link)
    return scholarship_dict(scholarship, link)


@app.patch("/api/scholarships/{scholarship_id}")
def update_tracking(
    scholarship_id: int,
    payload: ScholarshipPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    scholarship = db.get(Scholarship, scholarship_id)
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship not found.")

    link = db.scalar(
        select(UserScholarship).where(
            UserScholarship.user_id == user.id,
            UserScholarship.scholarship_id == scholarship_id,
        )
    )
    if not link:
        link = UserScholarship(user_id=user.id, scholarship_id=scholarship_id)
        db.add(link)

    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes:
        status = (changes["status"] or "").strip().lower()
        if status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=422, detail="Unsupported application status.")
        link.status = status
    if "saved" in changes:
        link.saved = bool(changes["saved"])
    if "notes" in changes:
        link.notes = (changes["notes"] or "").strip()[:10000]
    if "checklist" in changes:
        link.checklist = clean_list(changes["checklist"], 80)

    db.commit()
    db.refresh(link)
    return scholarship_dict(scholarship, link)


@app.get("/api/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    profile = get_or_create_profile(db, user)
    rows = db.execute(
        select(Scholarship, UserScholarship)
        .join(UserScholarship, UserScholarship.scholarship_id == Scholarship.id)
        .where(UserScholarship.user_id == user.id)
        .order_by(UserScholarship.fit_score.desc())
    ).all()
    items = [scholarship_dict(s, us) for s, us in rows]
    status_counts: dict[str, int] = {}
    for _, us in rows:
        status_counts[us.status] = status_counts.get(us.status, 0) + 1

    recent_searches = db.scalars(
        select(SearchRun).where(SearchRun.user_id == user.id).order_by(SearchRun.created_at.desc()).limit(8)
    ).all()

    return {
        "profile": profile_dict(profile),
        "stats": {
            "opportunities": len(items),
            "saved": sum(1 for _, us in rows if us.saved),
            "applying": status_counts.get("applying", 0) + status_counts.get("preparing", 0),
            "applied": status_counts.get("applied", 0),
        },
        "opportunities": items,
        "recent_searches": [
            {"id": s.id, "query": s.query, "result_count": s.result_count, "created_at": s.created_at}
            for s in recent_searches
        ],
        "ai_available": False,
    }


WEB_DIR = Path(__file__).resolve().parent.parent / "web"
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")
