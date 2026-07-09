from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.test_rbac import router as rbac_router
from app.api.v1.chat import router as chat_router
from app.api.v1.kb import router as kb_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.users import router as users_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rbac_router, prefix="/test-rbac", tags=["Role-Based Access Control"])
api_router.include_router(chat_router, prefix="/chat", tags=["AI Support Agent"])
api_router.include_router(kb_router, prefix="/kb", tags=["Knowledge Base"])
api_router.include_router(tickets_router, prefix="/tickets", tags=["Support Tickets"])
api_router.include_router(users_router, prefix="/users", tags=["User Management"])
