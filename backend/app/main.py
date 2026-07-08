from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.receipts import router as receipts_router
from backend.app.api.profile import router as profile_router
from backend.app.api.nutrition import router as nutrition_router
from backend.app.api.recommendations import router as recommendations_router
from backend.app.api.feedback import router as feedback_router
from backend.app.api.analytics import router as analytics_router

app = FastAPI(title="NutriWise API")

# Dev-only: allow the local Vite frontend to call this API from the
# browser. Vite falls back to 5174+ when 5173 is already taken, so a
# small range is allowlisted rather than just the default port.
# Tighten this to a real origin allowlist before deploy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://{host}:{port}"
        for host in ("localhost", "127.0.0.1")
        for port in range(5173, 5178)
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipts_router)
app.include_router(profile_router)
app.include_router(nutrition_router)
app.include_router(recommendations_router)
app.include_router(feedback_router)
app.include_router(analytics_router)
@app.get("/")
def root():
    return {"message": "NutriWise API is running"}