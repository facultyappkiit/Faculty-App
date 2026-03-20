from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List
from datetime import datetime, date as date_type, time as time_type, timedelta

from database import get_supabase
from models import (
    SubstituteRequestCreate,
    SubstituteRequestResponse,
    SubstituteRequestUpdate,
    AcceptRequest,
    CancelRequest
)
from services.push_notifications import notify_faculty_by_ids, notify_user
from middleware.auth import get_current_user, get_current_admin, TokenData

router = APIRouter()


TIME_PARSE_FORMATS = [
    "%H:%M",
    "%H:%M:%S",
    "%I:%M %p",
    "%I:%M%p",
]


def _parse_time_value(value: str) -> time_type:
    raw = (value or "").strip()
    for fmt in TIME_PARSE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            continue
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid time format: {value}"
    )


def _compute_time_window(start_value: str, duration_minutes: int) -> tuple[time_type, time_type]:
    start_time = _parse_time_value(start_value)
    duration = int(duration_minutes or 0)
    if duration <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be greater than 0"
        )

    start_dt = datetime.combine(datetime.utcnow().date(), start_time)
    end_dt = start_dt + timedelta(minutes=duration)
    if end_dt.date() != start_dt.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration cannot cross midnight"
        )

    return start_time, end_dt.time()


def _time_to_db_string(value: time_type) -> str:
    return value.strftime("%H:%M:%S")


def _parse_request_date(value) -> date_type:
    if isinstance(value, date_type):
        return value
    if value is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date is required")
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {value}. Expected YYYY-MM-DD"
        )


def _get_available_faculty_ids(exclude_user_id: int, request: dict) -> list[int]:
    supabase = get_supabase()

    users_result = supabase.table("users")\
        .select("id")\
        .neq("id", exclude_user_id)\
        .execute()

    candidate_ids = [user["id"] for user in (users_result.data or []) if user.get("id") is not None]
    if not candidate_ids:
        return []

    request_date = _parse_request_date(request.get("date"))
    request_time = request.get("time")
    duration = request.get("duration")

    start_time, end_time = _compute_time_window(request_time, duration)
    weekday = request_date.weekday()  # Monday=0 ... Sunday=6

    conflicts_result = supabase.table("teacher_class_schedules")\
        .select("user_id")\
        .in_("user_id", candidate_ids)\
        .eq("day_of_week", weekday)\
        .lt("start_time", _time_to_db_string(end_time))\
        .gt("end_time", _time_to_db_string(start_time))\
        .execute()

    busy_ids = {row["user_id"] for row in (conflicts_result.data or []) if row.get("user_id") is not None}
    return [user_id for user_id in candidate_ids if user_id not in busy_ids]


def _request_title(request: dict) -> str:
    if request.get("request_type") == "exam":
        campus = request.get("campus") or "Campus"
        return f"Exam Duty at {campus}"
    return request.get("subject") or "Class Substitute"


def _request_location(request: dict) -> str:
    if request.get("request_type") == "exam":
        return request.get("campus") or "Campus"
    return request.get("classroom") or "TBD"


def _request_summary(request: dict) -> str:
    if request.get("request_type") == "exam":
        return f"exam duty at {_request_location(request)} on {request['date']} at {request['time']}"
    return f"{_request_title(request)} in {_request_location(request)} on {request['date']} at {request['time']}"


def _build_response(req: dict, teacher: dict | None = None, acceptor: dict | None = None):
    return SubstituteRequestResponse(
        id=req["id"],
        teacher_id=req["teacher_id"],
        request_type=req.get("request_type") or "class",
        subject=req.get("subject"),
        date=req["date"],
        time=req["time"],
        duration=req["duration"],
        classroom=req.get("classroom"),
        campus=req.get("campus"),
        notes=req.get("notes"),
        status=req["status"],
        accepted_by=req.get("accepted_by"),
        created_at=req.get("created_at"),
        updated_at=req.get("updated_at"),
        teacher_name=teacher.get("name") if teacher else None,
        teacher_email=teacher.get("email") if teacher else None,
        teacher_department=teacher.get("department") if teacher else None,
        teacher_phone=teacher.get("phone") if teacher else None,
        acceptor_name=acceptor.get("name") if acceptor else None,
        acceptor_email=acceptor.get("email") if acceptor else None,
        acceptor_department=acceptor.get("department") if acceptor else None,
        acceptor_phone=acceptor.get("phone") if acceptor else None,
    )


def _sanitize_request_fields(payload: dict) -> dict:
    request_type = payload.get("request_type") or "class"
    data = {
        "request_type": request_type,
        "subject": payload.get("subject", "") or None,
        "date": str(payload["date"]) if payload.get("date") is not None else None,
        "time": payload.get("time"),
        "duration": payload.get("duration"),
        "classroom": payload.get("classroom", "") or None,
        "campus": payload.get("campus", "") or None,
        "notes": payload.get("notes"),
    }

    if request_type == "class":
        data["campus"] = None
    else:
        data["subject"] = None
        data["classroom"] = None

    return data


def _validate_update_payload(existing_request: dict, update_payload: dict) -> dict:
    merged = {
        "request_type": update_payload.get("request_type") or existing_request.get("request_type") or "class",
        "subject": update_payload.get("subject") if "subject" in update_payload else existing_request.get("subject"),
        "date": update_payload.get("date") if "date" in update_payload else existing_request.get("date"),
        "time": update_payload.get("time") if "time" in update_payload else existing_request.get("time"),
        "duration": update_payload.get("duration") if "duration" in update_payload else existing_request.get("duration"),
        "classroom": update_payload.get("classroom") if "classroom" in update_payload else existing_request.get("classroom"),
        "campus": update_payload.get("campus") if "campus" in update_payload else existing_request.get("campus"),
        "notes": update_payload.get("notes") if "notes" in update_payload else existing_request.get("notes"),
    }

    SubstituteRequestCreate(
        teacher_id=existing_request["teacher_id"],
        **merged,
    )
    return _sanitize_request_fields(merged)


@router.get("/", response_model=List[SubstituteRequestResponse])
async def get_pending_requests(current_user: TokenData = Depends(get_current_user)):
    """
    Get all pending substitute requests.
    Returns requests ordered by date and time.
    Requires authentication.
    """
    supabase = get_supabase()
    
    try:
        # Get pending requests with teacher name
        result = supabase.table("substitute_requests")\
            .select("*, users!substitute_requests_teacher_id_fkey(name)")\
            .eq("status", "pending")\
            .order("date")\
            .order("time")\
            .execute()
        
        requests_list = []
        for req in result.data:
            teacher_name = None
            if req.get("users"):
                teacher_name = req["users"].get("name")
            
            requests_list.append(_build_response(req, teacher={"name": teacher_name} if teacher_name else None))
        
        return requests_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch requests: {str(e)}"
        )


@router.get("/all", response_model=List[SubstituteRequestResponse])
async def get_all_requests(current_admin: TokenData = Depends(get_current_admin)):
    """
    Get all substitute requests (pending, accepted, cancelled).
    For admin panel use. Requires admin authentication.
    """
    supabase = get_supabase()
    
    try:
        # Get all requests with full teacher and acceptor details
        result = supabase.table("substitute_requests")\
            .select("*, teacher:users!substitute_requests_teacher_id_fkey(id, name, email, phone, department), acceptor:users!substitute_requests_accepted_by_fkey(id, name, email, phone, department)")\
            .order("created_at", desc=True)\
            .execute()
        
        requests_list = []
        for req in result.data:
            teacher = req.get("teacher") or {}
            acceptor = req.get("acceptor") or {}
            
            response = _build_response(
                req, 
                teacher=teacher if teacher else None,
                acceptor=acceptor if acceptor else None
            )
            requests_list.append(response)
        
        return requests_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch all requests: {str(e)}"
        )


@router.get("/teacher/{teacher_id}", response_model=List[SubstituteRequestResponse])
async def get_teacher_requests(teacher_id: int, current_user: TokenData = Depends(get_current_user)):
    """
    Get all substitute requests created by a specific teacher.
    Users can only access their own requests, admins can access any.
    """
    # Users can only view their own requests, admins can view any
    if current_user.token_type != "admin" and current_user.user_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this teacher's requests"
        )
    supabase = get_supabase()
    
    try:
        # Get requests with acceptor name and details
        result = supabase.table("substitute_requests")\
            .select("*, acceptor:users!substitute_requests_accepted_by_fkey(id, name, email, department, phone)")\
            .eq("teacher_id", teacher_id)\
            .order("created_at", desc=True)\
            .execute()
        
        requests_list = []
        for req in result.data:
            acceptor_name = None
            acceptor_email = None
            acceptor_department = None
            acceptor_phone = None
            if req.get("acceptor"):
                acceptor_name = req["acceptor"].get("name")
                acceptor_email = req["acceptor"].get("email")
                acceptor_department = req["acceptor"].get("department")
                acceptor_phone = req["acceptor"].get("phone")
            
            acceptor = None
            if acceptor_name or acceptor_email or acceptor_department or acceptor_phone:
                acceptor = {
                    "name": acceptor_name,
                    "email": acceptor_email,
                    "department": acceptor_department,
                    "phone": acceptor_phone,
                }
            requests_list.append(_build_response(req, acceptor=acceptor))
        
        return requests_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch teacher requests: {str(e)}"
        )


@router.get("/accepted-by/{teacher_id}", response_model=List[SubstituteRequestResponse])
async def get_accepted_requests(teacher_id: int, current_user: TokenData = Depends(get_current_user)):
    """
    Get all substitute requests accepted by a specific teacher.
    Users can only access their own accepted requests, admins can access any.
    """
    # Users can only view their own accepted requests, admins can view any
    if current_user.token_type != "admin" and current_user.user_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this teacher's accepted requests"
        )
    supabase = get_supabase()
    
    try:
        # Get requests accepted by this teacher with original teacher details
        result = supabase.table("substitute_requests")\
            .select("*, teacher:users!substitute_requests_teacher_id_fkey(id, name, email, department, phone)")\
            .eq("accepted_by", teacher_id)\
            .order("date")\
            .order("time")\
            .execute()
        
        requests_list = []
        for req in result.data:
            teacher_name = None
            teacher_email = None
            teacher_department = None
            teacher_phone = None
            if req.get("teacher"):
                teacher_name = req["teacher"].get("name")
                teacher_email = req["teacher"].get("email")
                teacher_department = req["teacher"].get("department")
                teacher_phone = req["teacher"].get("phone")
            
            teacher = None
            if teacher_name or teacher_email or teacher_department or teacher_phone:
                teacher = {
                    "name": teacher_name,
                    "email": teacher_email,
                    "department": teacher_department,
                    "phone": teacher_phone,
                }
            requests_list.append(_build_response(req, teacher=teacher))
        
        return requests_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch accepted requests: {str(e)}"
        )


@router.get("/{request_id}", response_model=SubstituteRequestResponse)
async def get_request(request_id: int, current_user: TokenData = Depends(get_current_user)):
    """
    Get a specific substitute request by ID.
    Requires authentication.
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table("substitute_requests")\
            .select("*, teacher:users!substitute_requests_teacher_id_fkey(name), acceptor:users!substitute_requests_accepted_by_fkey(name)")\
            .eq("id", request_id)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        req = result.data[0]
        teacher_name = req["teacher"]["name"] if req.get("teacher") else None
        acceptor_name = req["acceptor"]["name"] if req.get("acceptor") else None
        
        teacher = {"name": teacher_name} if teacher_name else None
        acceptor = {"name": acceptor_name} if acceptor_name else None

        return _build_response(req, teacher=teacher, acceptor=acceptor)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch request: {str(e)}"
        )


@router.post("/", response_model=SubstituteRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(request: SubstituteRequestCreate, current_user: TokenData = Depends(get_current_user)):
    """
    Create a new substitute request.
    Users can only create requests for themselves.
    """
    # Users can only create requests for themselves
    if current_user.token_type != "admin" and current_user.user_id != request.teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create requests for yourself"
        )
    
    supabase = get_supabase()
    
    try:
        # Verify teacher exists
        teacher_result = supabase.table("users").select("id, name").eq("id", request.teacher_id).execute()
        
        if not teacher_result.data or len(teacher_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        teacher_name = teacher_result.data[0]["name"]
        
        # Create request
        new_request = {
            "teacher_id": request.teacher_id,
            **_sanitize_request_fields(request.model_dump()),
            "status": "pending"
        }
        
        result = supabase.table("substitute_requests").insert(new_request).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create request"
            )
        
        req = result.data[0]
        
        # Notify only faculty who are free during the requested slot.
        available_teacher_ids = _get_available_faculty_ids(request.teacher_id, req)
        await notify_faculty_by_ids(
            user_ids=available_teacher_ids,
            title="📚 New Substitute Request",
            body=f"{teacher_name} needs a substitute for {_request_summary(new_request)}",
            data={
                "type": "new_request",
                "request_id": req["id"],
                "request_type": req.get("request_type") or "class",
                "subject": req.get("subject"),
            }
        )

        return _build_response(req, teacher={"name": teacher_name})
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create request: {str(e)}"
        )


@router.put("/{request_id}/accept", response_model=SubstituteRequestResponse)
async def accept_request(request_id: int, accept_data: AcceptRequest, current_user: TokenData = Depends(get_current_user)):
    """
    Accept a pending substitute request.
    Users can only accept requests as themselves.
    """
    # Users can only accept requests as themselves
    if current_user.token_type != "admin" and current_user.user_id != accept_data.teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only accept requests as yourself"
        )
    
    supabase = get_supabase()
    
    try:
        # Check if request exists and is pending
        check_result = supabase.table("substitute_requests")\
            .select("*")\
            .eq("id", request_id)\
            .execute()
        
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        if check_result.data[0]["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request is not available for acceptance"
            )
        
        # Verify acceptor exists and get their name
        acceptor_result = supabase.table("users")\
            .select("id, name")\
            .eq("id", accept_data.teacher_id)\
            .execute()
        
        if not acceptor_result.data or len(acceptor_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Accepting teacher not found"
            )
        
        acceptor_name = acceptor_result.data[0]["name"]
        original_request = check_result.data[0]
        
        # Accept the request
        result = supabase.table("substitute_requests")\
            .update({
                "status": "accepted",
                "accepted_by": accept_data.teacher_id,
                "updated_at": "now()"
            })\
            .eq("id", request_id)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to accept request"
            )
        
        req = result.data[0]
        
        # Notify the original requester that their request was accepted
        await notify_user(
            user_id=original_request["teacher_id"],
            title="✅ Request Accepted!",
            body=f"{acceptor_name} will cover your {_request_summary(req)}",
            data={
                "type": "request_accepted",
                "request_id": request_id,
            }
        )

        return _build_response(req, acceptor={"name": acceptor_name})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept request: {str(e)}"
        )


@router.put("/{request_id}", response_model=SubstituteRequestResponse)
async def update_request(
    request_id: int,
    request_update: SubstituteRequestUpdate,
    teacher_id: int = Query(...),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Update a substitute request (only by the teacher who created it).
    """
    # Users can only update their own requests
    if current_user.token_type != "admin" and current_user.user_id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own requests"
        )
    
    supabase = get_supabase()

    try:
        check_result = supabase.table("substitute_requests")\
            .select("*")\
            .eq("id", request_id)\
            .eq("teacher_id", teacher_id)\
            .execute()

        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or unauthorized"
            )

        original_request = check_result.data[0]
        if original_request["status"] in ["cancelled", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only active requests can be updated"
            )

        update_data = request_update.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        final_request_data = _validate_update_payload(original_request, update_data)

        result = supabase.table("substitute_requests")\
            .update({
                **final_request_data,
                "updated_at": "now()",
            })\
            .eq("id", request_id)\
            .execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update request"
            )

        req = result.data[0]

        teacher_result = supabase.table("users")\
            .select("id, name")\
            .eq("id", teacher_id)\
            .execute()
        teacher_name = teacher_result.data[0]["name"] if teacher_result.data else "Faculty Member"

        if original_request.get("accepted_by"):
            await notify_user(
                user_id=original_request["accepted_by"],
                title="✏️ Request Updated",
                body=f"{teacher_name} updated the substitute details for {_request_summary(req)}",
                data={
                    "type": "request_updated",
                    "request_id": request_id,
                    "target": "accepted",
                }
            )
        else:
            available_teacher_ids = _get_available_faculty_ids(teacher_id, req)
            await notify_faculty_by_ids(
                user_ids=available_teacher_ids,
                title="✏️ Substitute Request Updated",
                body=f"{teacher_name} updated a request for {_request_summary(req)}",
                data={
                    "type": "request_updated",
                    "request_id": request_id,
                    "target": "available",
                }
            )

        return _build_response(req, teacher={"name": teacher_name})
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept request: {str(e)}"
        )


@router.put("/{request_id}/cancel", response_model=SubstituteRequestResponse)
async def cancel_request(request_id: int, cancel_data: CancelRequest, current_user: TokenData = Depends(get_current_user)):
    """
    Cancel a substitute request (only by the teacher who created it).
    """
    # Users can only cancel their own requests
    if current_user.token_type != "admin" and current_user.user_id != cancel_data.teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own requests"
        )
    
    supabase = get_supabase()
    
    try:
        # Check if request exists and belongs to the teacher
        check_result = supabase.table("substitute_requests")\
            .select("*")\
            .eq("id", request_id)\
            .eq("teacher_id", cancel_data.teacher_id)\
            .execute()
        
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or unauthorized"
            )
        
        original_request = check_result.data[0]
        
        # Cancel the request
        result = supabase.table("substitute_requests")\
            .update({
                "status": "cancelled",
                "updated_at": "now()"
            })\
            .eq("id", request_id)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel request"
            )
        
        req = result.data[0]
        
        # If request was accepted by someone, notify them about cancellation
        if original_request.get("accepted_by"):
            await notify_user(
                user_id=original_request["accepted_by"],
                title="❌ Request Cancelled",
                body=f"The substitute request for {_request_summary(req)} has been cancelled",
                data={
                    "type": "request_cancelled",
                    "request_id": request_id,
                }
            )

        return _build_response(req)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel request: {str(e)}"
        )


@router.delete("/{request_id}")
async def delete_request(request_id: int, teacher_id: int = None, current_user: TokenData = Depends(get_current_user)):
    """
    Delete a substitute request.
    Admins can delete any request.
    Users can only delete their own requests (pass teacher_id as query param).
    """
    # Admins can delete any request
    if current_user.token_type == "admin":
        supabase = get_supabase()
        check_result = supabase.table("substitute_requests").select("*").eq("id", request_id).execute()
        if not check_result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        supabase.table("substitute_requests").delete().eq("id", request_id).execute()
        return {"message": "Request deleted successfully"}
    
    # Users must provide teacher_id and it must match their user_id
    if not teacher_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="teacher_id is required")
    
    if current_user.user_id != teacher_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own requests")
    
    supabase = get_supabase()
    
    try:
        # Check if request exists and belongs to the teacher
        check_result = supabase.table("substitute_requests")\
            .select("*")\
            .eq("id", request_id)\
            .eq("teacher_id", teacher_id)\
            .execute()
        
        if not check_result.data or len(check_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or unauthorized"
            )
        
        # Delete the request
        supabase.table("substitute_requests").delete().eq("id", request_id).execute()
        
        return {"message": "Request deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete request: {str(e)}"
        )
