from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.test_rbac import router as rbac_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rbac_router, prefix="/test-rbac", tags=["Role-Based Access Control"])
