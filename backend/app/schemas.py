from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    org_name: str = Field(min_length=1, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    org_id: str
    org_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DocumentResponse(BaseModel):
    id: str
    name: str
    size: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateThreadRequest(BaseModel):
    title: str = Field(default="New conversation", max_length=300)


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CitationResponse(BaseModel):
    chunk_id: str
    doc_name: str
    page: int | None
    snippet: str


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: list[CitationResponse] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatThreadResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: list[ChatMessageResponse] = []

    model_config = {"from_attributes": True}
