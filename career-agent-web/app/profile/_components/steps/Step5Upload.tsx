"use client";

import { useRef, useState } from "react";

import CoachMessage from "../CoachMessage";
import type { ProfileWizardState } from "../types";
import type { ExtractedEvidence } from "@/types/career";

const CS_SUBJECTS = [
  "자료구조", "운영체제", "데이터베이스", "네트워크",
  "컴퓨터구조", "알고리즘", "정보보안", "소프트웨어공학",
  "인공지능", "웹프로그래밍", "프로그래밍",
];

type LocalCourse = {
  id: string;
  courseName: string;
  grade: string;
  semester: string;
  isCore: boolean;
};

type Props = {
  onChange: (patch: Partial<ProfileWizardState>) => void;
};

function parseSemesterLabel(semester: string): string {
  if (!semester) return "기타";
  const match = semester.match(/^(\d{4})[^\d](\d)$/);
  if (match) return `${match[1]}년 ${match[2]}학기`;
  return semester;
}

function semesterSortKey(semester: string): string {
  if (!semester) return "0000-0";
  return semester;
}

function buildLocalCourses(courses: ExtractedEvidence["courses"]): LocalCourse[] {
  return (courses ?? []).map((c) => ({
    id: crypto.randomUUID(),
    courseName: c.courseName,
    grade: c.grade ?? "",
    semester: c.semester ?? "",
    isCore: CS_SUBJECTS.includes(c.courseName),
  }));
}

function syncExtractedCourses(courses: LocalCourse[], onChange: (p: Partial<ProfileWizardState>) => void) {
  onChange({ extractedCourses: courses.map((c) => c.courseName) });
}

export default function Step5Upload({ onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState("");
  const [gpa, setGpa] = useState<string | null>(null);
  const [courses, setCourses] = useState<LocalCourse[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ courseName: "", grade: "", semester: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ courseName: "", grade: "", semester: "" });

  async function handleFile(file: File) {
    setIsExtracting(true);
    setExtractMsg("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", "transcript");
    try {
      const res = await fetch("/api/evidence/extract", { method: "POST", body: formData });
      const data = (await res.json()) as ExtractedEvidence;
      const built = buildLocalCourses(data.courses);
      setCourses(built);
      setGpa(data.grade ?? null);
      syncExtractedCourses(built, onChange);
      if (data.warning) setExtractMsg(data.warning);
    } catch {
      setExtractMsg("파일 추출 중 오류가 발생했습니다.");
    } finally {
      setIsExtracting(false);
    }
  }

  function startEdit(course: LocalCourse) {
    setEditingId(course.id);
    setEditValues({ courseName: course.courseName, grade: course.grade, semester: course.semester });
  }

  function saveEdit() {
    const updated = courses.map((c) =>
      c.id === editingId
        ? { ...c, ...editValues, isCore: CS_SUBJECTS.includes(editValues.courseName) }
        : c
    );
    setCourses(updated);
    syncExtractedCourses(updated, onChange);
    setEditingId(null);
  }

  function deleteCourse(id: string) {
    const updated = courses.filter((c) => c.id !== id);
    setCourses(updated);
    syncExtractedCourses(updated, onChange);
  }

  function addCourse() {
    if (!newCourse.courseName.trim()) return;
    const added: LocalCourse = {
      id: crypto.randomUUID(),
      courseName: newCourse.courseName.trim(),
      grade: newCourse.grade,
      semester: newCourse.semester,
      isCore: CS_SUBJECTS.includes(newCourse.courseName.trim()),
    };
    const updated = [...courses, added];
    setCourses(updated);
    syncExtractedCourses(updated, onChange);
    setNewCourse({ courseName: "", grade: "", semester: "" });
    setShowAddForm(false);
  }

  // Group courses by semester, sorted descending
  const grouped = courses.reduce<Record<string, LocalCourse[]>>((acc, course) => {
    const key = course.semester || "기타";
    if (!acc[key]) acc[key] = [];
    acc[key].push(course);
    return acc;
  }, {});
  const semesterKeys = Object.keys(grouped).sort((a, b) =>
    semesterSortKey(b).localeCompare(semesterSortKey(a))
  );

  return (
    <div className="grid gap-6">
      <CoachMessage
        message="성적표 PDF를 올리면 수강 과목을 자동으로 인식합니다."
        sub="선택 사항입니다. 건너뛰어도 분석이 진행됩니다."
      />

      {/* Upload zone */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-[var(--line)] bg-white py-10 transition hover:border-[var(--navy)]/40"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <span className="text-4xl">📄</span>
        <p className="text-sm font-bold text-slate-600">
          {isExtracting ? "분석 중..." : "PDF 파일을 클릭하여 업로드"}
        </p>
        <p className="text-xs text-slate-400">성적표, 졸업증명서 등 (최대 10MB)</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {extractMsg ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {extractMsg}
        </p>
      ) : null}

      {/* Extraction result */}
      {courses.length > 0 ? (
        <div className="rounded-[2rem] border border-[var(--line)] bg-white overflow-hidden">
          {/* Header */}
          <div className="border-b border-[var(--line)] px-5 py-4 flex items-center justify-between bg-[var(--paper)]">
            <div className="flex items-center gap-3">
              <span className="text-lg">📘</span>
              <h3 className="font-extrabold text-[var(--ink)]">추출된 성적표</h3>
            </div>
            {gpa ? (
              <span className="rounded-full bg-[var(--navy)] px-3 py-1 text-sm font-black text-[var(--lime)]">
                GPA {gpa} / 4.5
              </span>
            ) : null}
          </div>

          {/* Semester groups */}
          <div className="divide-y divide-[var(--line)]">
            {semesterKeys.map((sem) => (
              <div key={sem} className="px-5 py-4">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  {parseSemesterLabel(sem)}
                </p>
                <div className="grid gap-2">
                  {grouped[sem].map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      isEditing={editingId === course.id}
                      editValues={editValues}
                      onEditValueChange={setEditValues}
                      onStartEdit={() => startEdit(course)}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={() => deleteCourse(course.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add course */}
          <div className="border-t border-[var(--line)] px-5 py-4">
            {showAddForm ? (
              <div className="grid gap-3">
                <p className="text-sm font-extrabold text-[var(--ink)]">과목 직접 추가</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newCourse.courseName}
                    onChange={(e) => setNewCourse((p) => ({ ...p, courseName: e.target.value }))}
                    placeholder="과목명"
                    className="col-span-1 h-10 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--navy)]"
                  />
                  <input
                    type="text"
                    value={newCourse.grade}
                    onChange={(e) => setNewCourse((p) => ({ ...p, grade: e.target.value }))}
                    placeholder="성적 (A+)"
                    className="h-10 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--navy)]"
                  />
                  <input
                    type="text"
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse((p) => ({ ...p, semester: e.target.value }))}
                    placeholder="학기 (2025-1)"
                    className="h-10 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--navy)]"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={addCourse} className="btn-dark text-sm">저장</button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="btn-light text-sm">취소</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-sm font-bold text-slate-500 hover:text-[var(--navy)]"
              >
                + 과목 직접 추가
              </button>
            )}
          </div>

          {/* Footer count */}
          <div className="border-t border-[var(--line)] bg-[var(--paper)] px-5 py-3">
            <p className="text-xs text-slate-400">
              총 {courses.length}개 과목 · 핵심과목 {courses.filter((c) => c.isCore).length}개 · 일반과목 {courses.filter((c) => !c.isCore).length}개
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type CourseRowProps = {
  course: LocalCourse;
  isEditing: boolean;
  editValues: { courseName: string; grade: string; semester: string };
  onEditValueChange: (v: { courseName: string; grade: string; semester: string }) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
};

function CourseRow({ course, isEditing, editValues, onEditValueChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete }: CourseRowProps) {
  if (isEditing) {
    return (
      <div className="rounded-2xl border border-[var(--navy)] bg-[var(--paper)] p-3">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={editValues.courseName}
            onChange={(e) => onEditValueChange({ ...editValues, courseName: e.target.value })}
            placeholder="과목명"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
            className="col-span-1 h-9 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--navy)]"
          />
          <input
            type="text"
            value={editValues.grade}
            onChange={(e) => onEditValueChange({ ...editValues, grade: e.target.value })}
            placeholder="성적"
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
            className="h-9 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--navy)]"
          />
          <input
            type="text"
            value={editValues.semester}
            onChange={(e) => onEditValueChange({ ...editValues, semester: e.target.value })}
            placeholder="학기"
            onKeyDown={(e) => e.key === "Enter" && onSaveEdit()}
            className="h-9 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-[var(--navy)]"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={onSaveEdit} className="text-xs font-bold text-[var(--navy)]">저장</button>
          <button type="button" onClick={onCancelEdit} className="text-xs text-slate-400">취소</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
            course.isCore
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {course.isCore ? "핵심" : "일반"}
        </span>
        <span className="text-sm font-semibold text-[var(--ink)] truncate">{course.courseName}</span>
        {course.grade ? (
          <span className="text-xs font-bold text-slate-400">{course.grade}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={onStartEdit} className="text-xs text-slate-400 hover:text-[var(--navy)]">
          수정
        </button>
        <button type="button" onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">
          삭제
        </button>
      </div>
    </div>
  );
}
