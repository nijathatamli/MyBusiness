from __future__ import annotations

import os
import random
import re
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash
import jwt

app = Flask(__name__)

# PostgreSQL default; can be overridden by DATABASE_URL env var.
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/mybusiness"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "change-me-in-production")
app.config["OTP_EXP_MINUTES"] = int(os.getenv("OTP_EXP_MINUTES", "10"))

db = SQLAlchemy(app)
CORS(app)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class OTPCode(db.Model):
    __tablename__ = "otp_codes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)


class Startup(db.Model):
    __tablename__ = "startups"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    industry = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    score_label = db.Column(db.String(20), nullable=False)
    score_value = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


GOOD_HINTS = {
    "traction", "revenue", "profit", "growth", "scalable", "retention", "enterprise", "recurring"
}
BAD_HINTS = {
    "no plan", "idea only", "burning cash", "lawsuit", "debt", "churn", "decline", "risky"
}


def classify_startup(description: str) -> tuple[str, float]:
    """Simple lightweight text scoring model returning great/normal/so bad."""
    text = re.sub(r"\s+", " ", description.lower()).strip()

    good_hits = sum(1 for token in GOOD_HINTS if token in text)
    bad_hits = sum(1 for token in BAD_HINTS if token in text)

    base = 0.5 + (good_hits * 0.12) - (bad_hits * 0.18)
    score = max(0.0, min(1.0, round(base, 3)))

    if score >= 0.7:
        return "great", score
    if score >= 0.4:
        return "normal", score
    return "so bad", score


def generate_jwt(user_id: int) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, app.config["JWT_SECRET"], algorithm="HS256")


def token_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
        if not token:
            return jsonify({"error": "Authorization token is missing"}), 401

        try:
            payload = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])
            user = db.session.get(User, payload["sub"])
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        if not user:
            return jsonify({"error": "User not found"}), 401

        return view_func(user, *args, **kwargs)

    return wrapped


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}

    required = ["first_name", "last_name", "email", "password"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    email = data["email"].strip().lower()
    if db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        first_name=data["first_name"].strip(),
        last_name=data["last_name"].strip(),
        email=email,
        password_hash=generate_password_hash(data["password"]),
    )
    db.session.add(user)
    db.session.flush()

    otp = OTPCode(
        user_id=user.id,
        code=f"{random.randint(0, 999999):06d}",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=app.config["OTP_EXP_MINUTES"]),
    )
    db.session.add(otp)
    db.session.commit()

    return jsonify(
        {
            "message": "Registered successfully. Verify OTP to activate account.",
            "user_id": user.id,
            "otp_debug": otp.code,
        }
    ), 201


@app.post("/api/auth/verify-otp")
def verify_otp():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    code = str(data.get("code", "")).strip()

    if not user_id or len(code) != 6:
        return jsonify({"error": "user_id and 6-digit code are required"}), 400

    user = db.session.get(User, int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404

    otp = (
        db.session.execute(
            db.select(OTPCode)
            .filter_by(user_id=user.id, code=code, used=False)
            .order_by(OTPCode.id.desc())
        )
        .scalars()
        .first()
    )

    if not otp:
        return jsonify({"error": "Invalid OTP"}), 400
    if otp.expires_at < datetime.now(timezone.utc):
        return jsonify({"error": "OTP expired"}), 400

    otp.used = True
    user.is_verified = True
    db.session.commit()

    return jsonify({"message": "Account verified"})


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401
    if not user.is_verified:
        return jsonify({"error": "Please verify OTP before login"}), 403

    return jsonify(
        {
            "token": generate_jwt(user.id),
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            },
        }
    )


@app.post("/api/startups")
@token_required
def create_startup(current_user: User):
    data = request.get_json(silent=True) or {}
    required = ["name", "industry", "description"]
    missing = [field for field in required if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    label, value = classify_startup(data["description"])
    startup = Startup(
        user_id=current_user.id,
        name=data["name"].strip(),
        industry=data["industry"].strip(),
        description=data["description"].strip(),
        score_label=label,
        score_value=value,
    )
    db.session.add(startup)
    db.session.commit()

    return jsonify(
        {
            "id": startup.id,
            "name": startup.name,
            "industry": startup.industry,
            "score_label": startup.score_label,
            "score_value": startup.score_value,
            "created_at": startup.created_at.isoformat(),
        }
    ), 201


@app.get("/api/startups")
@token_required
def list_startups(current_user: User):
    startups = (
        db.session.execute(
            db.select(Startup)
            .filter_by(user_id=current_user.id)
            .order_by(Startup.created_at.desc())
        )
        .scalars()
        .all()
    )

    return jsonify(
        [
            {
                "id": s.id,
                "name": s.name,
                "industry": s.industry,
                "description": s.description,
                "score_label": s.score_label,
                "score_value": s.score_value,
                "created_at": s.created_at.isoformat(),
            }
            for s in startups
        ]
    )


@app.get("/api/dashboard")
@token_required
def dashboard(current_user: User):
    total = db.session.execute(
        db.select(func.count(Startup.id)).filter_by(user_id=current_user.id)
    ).scalar_one()

    grouped = db.session.execute(
        db.select(Startup.score_label, func.count(Startup.id))
        .filter_by(user_id=current_user.id)
        .group_by(Startup.score_label)
    ).all()

    counts = {"great": 0, "normal": 0, "so bad": 0}
    for label, count in grouped:
        counts[label] = count

    return jsonify(
        {
            "total_startups": total,
            "status_breakdown": counts,
            "percentages": {
                k: (round(v / total * 100, 2) if total else 0) for k, v in counts.items()
            },
        }
    )


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
