from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Literal, Optional
from datetime import datetime, date


class UserBase(BaseModel):
    name: str
    email: EmailStr
    department: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str

    @field_validator("email")
    @classmethod
    def validate_kiit_faculty_email(cls, v: str) -> str:
        """
        Validate that email is a KIIT faculty email.
        - Must end with @kiit.ac.in
        """
        email_lower = v.lower()

        # Check if email ends with @kiit.ac.in
        if not email_lower.endswith("@kiit.ac.in"):
            raise ValueError("Email must be a KIIT email (@kiit.ac.in)")

        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    auth_id: Optional[str] = None  # Supabase Auth UUID
    name: str
    email: str
    department: Optional[str] = None
    phone: Optional[str] = None
    email_verified: Optional[bool] = False
    push_token: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None


# Push token update
class PushTokenUpdate(BaseModel):
    push_token: str


# Signup response
class SignupResponse(BaseModel):
    message: str
    email: str
    user_id: str


# Verify OTP request (for email verification)
class VerifyOTPRequest(BaseModel):
    email: EmailStr
    token: str


# Substitute Request Models
class SubstituteRequestBase(BaseModel):
    request_type: Literal["class", "exam"] = "class"
    subject: Optional[str] = None
    date: date
    time: str
    duration: int  # in minutes
    classroom: Optional[str] = None
    campus: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_request_fields(self):
        if self.request_type == "class":
            if not self.subject or not self.subject.strip():
                raise ValueError("Subject is required for class substitutes")
            if not self.classroom or not self.classroom.strip():
                raise ValueError("Room number is required for class substitutes")
        else:
            if not self.campus or not self.campus.strip():
                raise ValueError("Campus is required for exam substitutes")
        return self


class SubstituteRequestCreate(SubstituteRequestBase):
    teacher_id: int


class SubstituteRequestResponse(SubstituteRequestBase):
    id: int
    teacher_id: int
    status: str
    accepted_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    teacher_department: Optional[str] = None
    teacher_phone: Optional[str] = None
    acceptor_name: Optional[str] = None
    acceptor_email: Optional[str] = None
    acceptor_department: Optional[str] = None
    acceptor_phone: Optional[str] = None

    class Config:
        from_attributes = True


class SubstituteRequestUpdate(BaseModel):
    request_type: Optional[Literal["class", "exam"]] = None
    subject: Optional[str] = None
    date: Optional[date] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    classroom: Optional[str] = None
    campus: Optional[str] = None
    notes: Optional[str] = None


class AcceptRequest(BaseModel):
    teacher_id: int


class CancelRequest(BaseModel):
    teacher_id: int


# Token models for Supabase authentication
class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    expires_in: Optional[int] = None
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
