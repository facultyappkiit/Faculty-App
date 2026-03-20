# Faculty Substitute API - FastAPI Backend

A FastAPI backend for managing faculty substitute requests at KIIT University with **Supabase Authentication** and email verification.

## Features

- **Supabase Authentication**: Email-based signup with verification
- **Email Verification**: Users must verify their email before logging in
- **Password Reset**: Built-in forgot password functionality
- **Email Validation**: Only KIIT emails (@kiit.ac.in) can register
- **Substitute Requests**: Create, view, accept, cancel, and delete substitute requests
- **User Management**: View and update faculty profiles
- **JWT Tokens**: Secure access with refresh token support

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Supabase** - Authentication + PostgreSQL database
- **Pydantic** - Data validation
- **Supabase Auth** - Email verification & JWT tokens

## Setup

### 1. Create a Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Supabase

#### 3.1 Create Supabase Project
1. Create a project at [Supabase](https://supabase.com)
2. Go to SQL Editor and run `database/schema.sql` to create the tables

#### 3.2 Configure Email Authentication
1. Go to **Authentication > Providers**
2. Make sure **Email** provider is enabled
3. Go to **Authentication > URL Configuration**
4. Set your **Site URL** (e.g., `http://localhost:3000` for development)
5. Add redirect URLs if needed

#### 3.3 (Optional) Configure Custom SMTP for Production
1. Go to **Project Settings > Authentication**
2. Scroll to **SMTP Settings**
3. Enable custom SMTP and add your email server details

#### 3.4 Get API Keys
1. Go to **Settings > API**
2. Copy the **Project URL** and **anon public** key

### 4. Environment Variables

Create a `.env` file in the backend directory:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Note: Admin invite endpoints require `SUPABASE_SERVICE_ROLE_KEY`. If this is missing, invite emails will fail with "User not allowed".

### 5. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user (sends verification email) |
| POST | `/api/auth/login` | Login (requires verified email) |
| POST | `/api/auth/resend-verification?email=...` | Resend verification email |
| POST | `/api/auth/refresh-token?refresh_token=...` | Refresh access token |
| POST | `/api/auth/logout?access_token=...` | Logout user |
| GET | `/api/auth/me?access_token=...` | Get current user info |
| POST | `/api/auth/forgot-password?email=...` | Send password reset email |

### Authentication Flow

```
1. User signs up → Verification email sent
2. User clicks verification link in email
3. User can now login
4. Login returns access_token + refresh_token
5. Use access_token for authenticated requests
6. When access_token expires, use refresh_token to get new one
```

### Substitute Requests (`/api/requests`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/requests` | Get all pending requests |
| GET | `/api/requests/{id}` | Get a specific request |
| GET | `/api/requests/teacher/{teacher_id}` | Get requests by teacher |
| POST | `/api/requests` | Create a new request |
| PUT | `/api/requests/{id}/accept` | Accept a request |
| PUT | `/api/requests/{id}/cancel` | Cancel a request |
| DELETE | `/api/requests/{id}?teacher_id=...` | Delete a request |

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/{id}` | Get a specific user |
| PUT | `/api/users/{id}` | Update user profile |
| DELETE | `/api/users/{id}` | Delete a user |

## Example Requests

### Signup (Sends Verification Email)

```bash
curl -X POST "http://localhost:8000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Smith",
    "email": "smith@kiit.ac.in",
    "password": "securepassword123",
    "department": "Computer Science",
    "phone": "1234567890"
  }'
```

Response:
```json
{
  "message": "Verification email sent! Please check your inbox and verify your email before logging in.",
  "email": "smith@kiit.ac.in",
  "user_id": "uuid-here"
}
```

### Login (After Email Verification)

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smith@kiit.ac.in",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "abc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "auth_id": "uuid-here",
    "name": "Dr. Smith",
    "email": "smith@kiit.ac.in",
    "department": "Computer Science",
    "phone": "1234567890",
    "email_verified": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### Resend Verification Email

```bash
curl -X POST "http://localhost:8000/api/auth/resend-verification?email=smith@kiit.ac.in"
```

### Create Substitute Request

```bash
curl -X POST "http://localhost:8000/api/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": 1,
    "subject": "Data Structures",
    "date": "2024-01-15",
    "time": "10:00 AM",
    "duration": 60,
    "classroom": "Room 101",
    "notes": "Chapter 5 - Binary Trees"
  }'
```

## Database Schema

### Users Table
- `id` - Primary key (auto-increment)
- `auth_id` - Supabase Auth UUID (unique)
- `name` - Faculty name
- `email` - KIIT email (unique)
- `department` - Department name
- `phone` - Contact number
- `email_verified` - Email verification status
- `created_at` - Timestamp

### Substitute Requests Table
- `id` - Primary key
- `teacher_id` - Foreign key to users
- `subject` - Subject name
- `date` - Class date
- `time` - Class time
- `duration` - Duration in minutes
- `classroom` - Room/location
- `notes` - Additional notes
- `status` - pending/accepted/completed/cancelled
- `accepted_by` - Foreign key to users (who accepted)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Troubleshooting

### Email not received?
1. Check spam/junk folder
2. Verify Supabase email settings are configured
3. Use `/api/auth/resend-verification` to resend

### "Email not verified" error?
User must click the verification link in their email before logging in.

### Token expired?
Use the refresh token to get a new access token:
```bash
curl -X POST "http://localhost:8000/api/auth/refresh-token?refresh_token=your_refresh_token"
```

## License

MIT License
