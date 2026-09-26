from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160), default="")
    nationality: Mapped[str] = mapped_column(String(120), default="")
    residence_country: Mapped[str] = mapped_column(String(120), default="")
    degree: Mapped[str] = mapped_column(String(220), default="")
    university: Mapped[str] = mapped_column(String(220), default="")
    cgpa: Mapped[str] = mapped_column(String(40), default="")
    graduation_year: Mapped[str] = mapped_column(String(20), default="")
    fields: Mapped[list] = mapped_column(JSON, default=list)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    publications: Mapped[list] = mapped_column(JSON, default=list)
    experience: Mapped[list] = mapped_column(JSON, default=list)
    achievements: Mapped[list] = mapped_column(JSON, default=list)
    target_degrees: Mapped[list] = mapped_column(JSON, default=lambda: ["MSc", "MS", "MPhil"])
    target_countries: Mapped[list] = mapped_column(JSON, default=list)
    funding_required: Mapped[bool] = mapped_column(Boolean, default=True)
    english_test: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    cv_text: Mapped[str] = mapped_column(Text, default="")
    cv_filename: Mapped[str] = mapped_column(String(255), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="profile")


class Scholarship(Base):
    __tablename__ = "scholarships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(300))
    provider: Mapped[str] = mapped_column(String(260), default="")
    country: Mapped[str] = mapped_column(String(160), default="")
    degree_level: Mapped[str] = mapped_column(String(100), default="")
    funding: Mapped[str] = mapped_column(Text, default="")
    deadline: Mapped[str] = mapped_column(String(80), default="")
    eligibility: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    url: Mapped[str] = mapped_column(Text)
    source_domain: Mapped[str] = mapped_column(String(255), default="")
    source_type: Mapped[str] = mapped_column(String(40), default="web")
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UserScholarship(Base):
    __tablename__ = "user_scholarships"
    __table_args__ = (UniqueConstraint("user_id", "scholarship_id", name="uq_user_scholarship"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scholarship_id: Mapped[int] = mapped_column(ForeignKey("scholarships.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="discovered")
    saved: Mapped[bool] = mapped_column(Boolean, default=False)
    fit_score: Mapped[float] = mapped_column(Float, default=0.0)
    fit_summary: Mapped[str] = mapped_column(Text, default="")
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    gaps: Mapped[list] = mapped_column(JSON, default=list)
    checklist: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class SearchRun(Base):
    __tablename__ = "search_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    query: Mapped[str] = mapped_column(Text)
    result_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
