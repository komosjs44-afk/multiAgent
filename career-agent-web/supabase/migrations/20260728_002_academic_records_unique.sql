-- academic_records 중복 방지: 동일 사용자·학기·과목명 조합은 한 행만 존재하도록 강제합니다.
-- semester/course_name은 이미 not null (기본값 '')이라 NULL 처리를 별도로 신경 쓸 필요가 없습니다.

-- 제약을 추가하기 전에, 이미 존재할 수 있는 중복 행을 정리합니다.
-- 같은 (user_id, semester, course_name) 조합 중 가장 최근에 생성된 행만 남기고 나머지는 삭제합니다.
delete from public.academic_records a
using public.academic_records b
where a.user_id = b.user_id
  and a.semester = b.semester
  and a.course_name = b.course_name
  and (
    a.created_at < b.created_at
    or (a.created_at = b.created_at and a.id < b.id)
  );

create unique index if not exists academic_records_user_semester_course_idx
  on public.academic_records (user_id, semester, course_name);
