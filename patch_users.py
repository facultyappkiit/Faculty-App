import re

with open("backend/routes/users.py", "r") as f:
    content = f.read()

# 1. Update _extract_matrix_schedule_rows to parse room number if separated by newline
matrix_old = """
            subject_text = str(cell_value).strip()
            if len(subject_text) > 120:
                subject_text = subject_text[:120]

            records.append(
                {
                    "day_of_week": day_of_week,
                    "start_time": start_t.strftime("%H:%M:%S"),
                    "end_time": end_t.strftime("%H:%M:%S"),
                    "subject": subject_text or None,
                    "source_file": file_name,
                }
            )
"""
matrix_new = """
            cell_str = str(cell_value).strip()
            subject_text = cell_str
            classroom_text = None
            
            # If the cell has multiple lines, assume the last line might be the room number
            if '\\n' in cell_str:
                parts = [p.strip() for p in cell_str.split('\\n') if p.strip()]
                if len(parts) > 1:
                    subject_text = ' '.join(parts[:-1])
                    classroom_text = parts[-1]

            if len(subject_text) > 120:
                subject_text = subject_text[:120]
            if classroom_text and len(classroom_text) > 50:
                classroom_text = classroom_text[:50]

            records.append(
                {
                    "day_of_week": day_of_week,
                    "start_time": start_t.strftime("%H:%M:%S"),
                    "end_time": end_t.strftime("%H:%M:%S"),
                    "subject": subject_text or None,
                    "classroom": classroom_text or None,
                    "source_file": file_name,
                }
            )
"""
content = content.replace(matrix_old.strip('\n'), matrix_new.strip('\n'))

# 2. Update _extract_columnar_schedule_rows
col_old = """
    duration_idx = None
    subject_idx = None

    for idx, row in enumerate(rows):
        normalized = [_normalize_header(cell) for cell in row]
        candidate_day_idx = _find_header_index(normalized, ["day", "weekday"])
        candidate_start_idx = _find_header_index(normalized, ["starttime", "start", "time"])
        candidate_end_idx = _find_header_index(normalized, ["endtime", "end"])
        candidate_duration_idx = _find_header_index(normalized, ["duration", "minutes", "mins"])
        candidate_subject_idx = _find_header_index(normalized, ["subject", "course", "class"])

        if candidate_day_idx is not None and candidate_start_idx is not None and (
            candidate_end_idx is not None or candidate_duration_idx is not None
        ):
            header_index = idx
            day_idx = candidate_day_idx
            start_idx = candidate_start_idx
            end_idx = candidate_end_idx
            duration_idx = candidate_duration_idx
            subject_idx = candidate_subject_idx
            break
"""
col_new = """
    duration_idx = None
    subject_idx = None
    classroom_idx = None

    for idx, row in enumerate(rows):
        normalized = [_normalize_header(cell) for cell in row]
        candidate_day_idx = _find_header_index(normalized, ["day", "weekday"])
        candidate_start_idx = _find_header_index(normalized, ["starttime", "start", "time"])
        candidate_end_idx = _find_header_index(normalized, ["endtime", "end"])
        candidate_duration_idx = _find_header_index(normalized, ["duration", "minutes", "mins"])
        candidate_subject_idx = _find_header_index(normalized, ["subject", "course", "class"])
        candidate_classroom_idx = _find_header_index(normalized, ["room", "classroom"])

        if candidate_day_idx is not None and candidate_start_idx is not None and (
            candidate_end_idx is not None or candidate_duration_idx is not None
        ):
            header_index = idx
            day_idx = candidate_day_idx
            start_idx = candidate_start_idx
            end_idx = candidate_end_idx
            duration_idx = candidate_duration_idx
            subject_idx = candidate_subject_idx
            classroom_idx = candidate_classroom_idx
            break
"""
content = content.replace(col_old.strip('\n'), col_new.strip('\n'))

col_rec_old = """
            subject = None
            if subject_idx is not None and subject_idx < len(row) and row[subject_idx] is not None:
                subject = str(row[subject_idx]).strip() or None

            records.append(
                {
                    "day_of_week": day_of_week,
                    "start_time": start_time.strftime("%H:%M:%S"),
                    "end_time": end_time.strftime("%H:%M:%S"),
                    "subject": subject,
                    "source_file": file_name,
                }
            )
"""
col_rec_new = """
            subject = None
            if subject_idx is not None and subject_idx < len(row) and row[subject_idx] is not None:
                subject = str(row[subject_idx]).strip() or None

            classroom = None
            if classroom_idx is not None and classroom_idx < len(row) and row[classroom_idx] is not None:
                classroom = str(row[classroom_idx]).strip() or None

            records.append(
                {
                    "day_of_week": day_of_week,
                    "start_time": start_time.strftime("%H:%M:%S"),
                    "end_time": end_time.strftime("%H:%M:%S"),
                    "subject": subject,
                    "classroom": classroom,
                    "source_file": file_name,
                }
            )
"""
content = content.replace(col_rec_old.strip('\n'), col_rec_new.strip('\n'))

# 3. Update get_class_schedule queries
query1_old = 'schedule_result = supabase.table("teacher_class_schedules")\\\n                .select("id, teacher_id, day_of_week, start_time, end_time, subject, substitute_request_id")'
query1_new = 'schedule_result = supabase.table("teacher_class_schedules")\\\n                .select("id, teacher_id, day_of_week, start_time, end_time, subject, classroom, substitute_request_id")'
content = content.replace(query1_old, query1_new)

query2_old = 'schedule_result = supabase.table("teacher_class_schedules")\\\n                .select("id, teacher_id, day_of_week, start_time, end_time, subject")'
query2_new = 'schedule_result = supabase.table("teacher_class_schedules")\\\n                .select("id, teacher_id, day_of_week, start_time, end_time, subject, classroom")'
content = content.replace(query2_old, query2_new)

# Update return dict mapping for schedules
item_old = """
            ClassScheduleItem(
                id=item["id"],
                teacher_id=item["teacher_id"],
                day_of_week=item["day_of_week"],
                start_time=item["start_time"],
                end_time=item["end_time"],
                subject=item.get("subject"),
                substitute_request_id=item.get("substitute_request_id"),
            )
"""
item_new = """
            ClassScheduleItem(
                id=item["id"],
                teacher_id=item["teacher_id"],
                day_of_week=item["day_of_week"],
                start_time=item["start_time"],
                end_time=item["end_time"],
                subject=item.get("subject"),
                classroom=item.get("classroom"),
                substitute_request_id=item.get("substitute_request_id"),
            )
"""
content = content.replace(item_old.strip('\n'), item_new.strip('\n'))

with open("backend/routes/users.py", "w") as f:
    f.write(content)
