from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import auth, requests, users, admin

app = FastAPI(
    title="Faculty Substitute API",
    description="API for managing faculty substitute requests at KIIT",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(requests.router, prefix="/api/requests", tags=["Substitute Requests"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "Faculty Substitute API is running"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Faculty Substitute API", "docs": "/docs"}
