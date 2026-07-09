#!/usr/bin/env python3
"""
ConversaHub — First Admin Seed Script
======================================
Creates the initial admin account if it does not already exist.
Run once after first launch:

    cd /Users/mizhabas/ConversaHub
    PYTHONPATH=backend .venv/bin/python backend/scripts/seed_admin.py
"""

import asyncio
import sys
import os

# Make sure imports resolve from the backend package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import async_session_maker, create_tables
from app.repositories.user import UserRepository
from app.core.security import get_password_hash

# ── Seed credentials ──────────────────────────────────────────
ADMIN_EMAIL    = "mizhabas@conversahub.com"
ADMIN_PASSWORD = "LiveYourLifefix"
ADMIN_ROLE     = "admin"


async def seed():
    # 1. Ensure tables exist (safe to run even if already created)
    await create_tables()

    async with async_session_maker() as db:
        user_repo = UserRepository(db)

        # 2. Check if admin already exists
        existing = await user_repo.get_by_email(ADMIN_EMAIL)
        if existing:
            print(f"✓ Admin already exists: {ADMIN_EMAIL} (role={existing.role})")
            return

        # 3. Create the admin
        hashed = get_password_hash(ADMIN_PASSWORD)
        admin = await user_repo.create(obj_in={
            "email":           ADMIN_EMAIL,
            "hashed_password": hashed,
            "role":            ADMIN_ROLE,
            "is_active":       True,
        })
        print(f"✓ Admin created successfully!")
        print(f"  Email   : {admin.email}")
        print(f"  Role    : {admin.role}")
        print(f"  ID      : {admin.id}")
        print()
        print("  Log in at: http://localhost:3000/login")
        print("  → Go to Admin Dashboard → Users tab to promote agents")


if __name__ == "__main__":
    asyncio.run(seed())
