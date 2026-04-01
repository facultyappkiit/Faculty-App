with open("backend/routes/requests.py", "r", encoding="utf-8") as f:
    content = f.read()

def replace(old, new):
    global content
    if old not in content:
        print("Warning: could not find old string:", old[:50])
    content = content.replace(old, new)

old_insert_schedule = """
                schedule_result = supabase.table("teacher_class_schedules")\\
                    .insert({
                        "teacher_id": db_request["accepted_by"],
                        "day_of_week": day_of_week,
                        "start_time": db_request["time"][:8],
                        "end_time": end_time.strftime("%H:%M:%S"),
                        "subject": f"Sub: {db_request.get('subject', 'Class')}",
                        "substitute_request_id": db_request["id"]
                    }).execute()
"""
new_insert_schedule = """
                schedule_result = supabase.table("teacher_class_schedules")\\
                    .insert({
                        "teacher_id": db_request["accepted_by"],
                        "day_of_week": day_of_week,
                        "start_time": db_request["time"][:8],
                        "end_time": end_time.strftime("%H:%M:%S"),
                        "subject": f"Sub: {db_request.get('subject', 'Class')}",
                        "classroom": db_request.get('classroom'),
                        "substitute_request_id": db_request["id"]
                    }).execute()
"""
replace(old_insert_schedule.strip('\n'), new_insert_schedule.strip('\n'))

old_insert_fallback = """
                schedule_result = supabase.table("teacher_class_schedules")\\
                    .insert({
                        "teacher_id": db_request["accepted_by"],
                        "day_of_week": day_of_week,
                        "start_time": db_request["time"][:8],
                        "end_time": end_time.strftime("%H:%M:%S"),
                        "subject": f"Sub: {db_request.get('subject', 'Class')}"
                    }).execute()
"""
new_insert_fallback = """
                schedule_result = supabase.table("teacher_class_schedules")\\
                    .insert({
                        "teacher_id": db_request["accepted_by"],
                        "day_of_week": day_of_week,
                        "start_time": db_request["time"][:8],
                        "end_time": end_time.strftime("%H:%M:%S"),
                        "subject": f"Sub: {db_request.get('subject', 'Class')}",
                        "classroom": db_request.get('classroom')
                    }).execute()
"""
replace(old_insert_fallback.strip('\n'), new_insert_fallback.strip('\n'))

with open("backend/routes/requests.py", "w", encoding="utf-8") as f:
    f.write(content)
