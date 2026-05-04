"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectDetailModal } from "@/components/modals/ProjectDetailModal";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import type { ProjectSummary } from "@/components/projects/project-board-types";

interface ProjectResponse {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  progress?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  doneTasks: number;
  _count?: { tasks: number };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  members: Member[];
  onCreated?: (project: ProjectResponse) => void;
  onSaved?: (project: ProjectResponse) => void;
  onDeleted?: (projectId: string) => void;
  onClose: () => void;
  project?: ProjectSummary | null;
  existingProjectNames?: string[];
  defaultProjectName?: string;
  canDelete?: boolean;
  startInEditMode?: boolean;
}

type ProjectMetaStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

const COLOR_OPTIONS = ["#4f7cff", "#2A8C50", "#f97316", "#ef4444", "#8b5cf6", "#eab308"];
const MEMBER_AVATAR_COLORS = [
  { background: "#F6E3A6", color: "#5a4200" },
  { background: "#F6C6A0", color: "#7a3800" },
  { background: "#F4B8C8", color: "#7a2040" },
  { background: "#C8E6C8", color: "#1a4a1a" },
  { background: "#B8D4F4", color: "#0a3060" },
  { background: "#D4C8F4", color: "#3a2070" },
];

const STATUS_OPTIONS: Array<{
  value: ProjectMetaStatus;
  label: string;
  chipClassName: string;
  dotColor: string;
}> = [
  { value: "TODO", label: "예정", chipClassName: "sel-TODO", dotColor: "#9ca3af" },
  {
    value: "IN_PROGRESS",
    label: "진행 중",
    chipClassName: "sel-IN_PROGRESS",
    dotColor: "#4f7cff",
  },
  {
    value: "IN_REVIEW",
    label: "검토 중",
    chipClassName: "sel-IN_REVIEW",
    dotColor: "#f97316",
  },
  { value: "DONE", label: "완료", chipClassName: "sel-DONE", dotColor: "#2A8C50" },
];

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code: string) =>
    String.fromCharCode(parseInt(code, 16))
  );
}

function decodeMaybeEscapedString(value?: string | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.includes("\\u") ? decodeEscapedUnicode(value) : value;
}

function formatDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialMetaStatus(project?: ProjectSummary | null): ProjectMetaStatus {
  switch (project?.boardStatus) {
    case "ONGOING":
      return "IN_PROGRESS";
    case "REVIEW":
      return "IN_REVIEW";
    case "COMPLETED":
      return "DONE";
    default:
      return "TODO";
  }
}

function getInitialPmId(project: ProjectSummary | null | undefined, members: Member[]) {
  const projectAssigneeName = project?.assigneeNames?.[0]?.trim();
  if (!projectAssigneeName) {
    return null;
  }

  const matchedMember = members.find((member) => member.name?.trim() === projectAssigneeName);
  return matchedMember?.id ?? null;
}

function getMemberLabel(member?: Member | null) {
  const safeName = decodeMaybeEscapedString(member?.name);
  return safeName.trim() || "이름 없음";
}

function getInitials(value?: string | null) {
  const name = value?.trim();
  if (!name) {
    return "?";
  }

  return name.slice(0, 1).toUpperCase();
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return decodeMaybeEscapedString(data.error);
    }
  } catch {
    return "프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function ProjectCreateModal({
  members,
  onCreated,
  onSaved,
  onDeleted,
  onClose,
  project = null,
  existingProjectNames = [],
  defaultProjectName,
  canDelete = false,
  startInEditMode = false,
}: Props) {
  void existingProjectNames;
  const isExistingProject = Boolean(project);
  const initialMetaStatus = useMemo(() => getInitialMetaStatus(project), [project]);
  const initialPmId = useMemo(() => getInitialPmId(project, members), [members, project]);
  const initialStartDate = useMemo(() => formatDateInputValue(project?.startDate), [project?.startDate]);
  const initialEndDate = useMemo(() => formatDateInputValue(project?.endDate), [project?.endDate]);
  const initialPeriodOpen = Boolean(initialStartDate || initialEndDate);

  const [name, setName] = useState(
    decodeMaybeEscapedString(project?.name ?? defaultProjectName ?? "")
  );
  const [subtitle, setSubtitle] = useState(decodeMaybeEscapedString(project?.subtitle));
  const [description, setDescription] = useState(
    decodeMaybeEscapedString(project?.description)
  );
  const [color, setColor] = useState(project?.color ?? COLOR_OPTIONS[0]);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [progress, setProgress] = useState(String(project?.progress ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameError, setShowNameError] = useState(false);
  const [isEditing, setIsEditing] = useState(!project || startInEditMode);
  const [statusPanelOpen, setStatusPanelOpen] = useState(Boolean(project));
  const [selectedStatus, setSelectedStatus] = useState<ProjectMetaStatus>(initialMetaStatus);
  const [pmPanelOpen, setPmPanelOpen] = useState(Boolean(initialPmId));
  const [selectedPmId, setSelectedPmId] = useState<string | null>(initialPmId);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [periodPanelOpen, setPeriodPanelOpen] = useState(initialPeriodOpen);
  const [noPeriod, setNoPeriod] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(decodeMaybeEscapedString(project?.name ?? defaultProjectName ?? ""));
    setSubtitle(decodeMaybeEscapedString(project?.subtitle));
    setDescription(decodeMaybeEscapedString(project?.description));
    setColor(project?.color ?? COLOR_OPTIONS[0]);
    setStartDate(formatDateInputValue(project?.startDate));
    setEndDate(formatDateInputValue(project?.endDate));
    setProgress(String(project?.progress ?? 0));
    setLoading(false);
    setError(null);
    setShowNameError(false);
    setIsEditing(!project || startInEditMode);
    setSelectedStatus(getInitialMetaStatus(project));
    setStatusPanelOpen(Boolean(project));
    const nextPmId = getInitialPmId(project, members);
    setSelectedPmId(nextPmId);
    setPmPanelOpen(Boolean(nextPmId));
    setMemberDropdownOpen(false);
    const nextStartDate = formatDateInputValue(project?.startDate);
    const nextEndDate = formatDateInputValue(project?.endDate);
    setPeriodPanelOpen(Boolean(nextStartDate || nextEndDate));
    setNoPeriod(false);
  }, [defaultProjectName, members, project, startInEditMode]);

  const selectedPm = useMemo(
    () => members.find((member) => member.id === selectedPmId) ?? null,
    [members, selectedPmId]
  );
  const nameCount = name.length;
  const descriptionCount = description.length;
  const hasDateWarning =
    periodPanelOpen && !noPeriod && Boolean(startDate && endDate && endDate < startDate);
  const initialDraft = useMemo(
    () => ({
      name: project?.name ?? defaultProjectName ?? "",
      subtitle: decodeMaybeEscapedString(project?.subtitle),
      description: decodeMaybeEscapedString(project?.description),
      color: project?.color ?? COLOR_OPTIONS[0],
      startDate: initialStartDate,
      endDate: initialEndDate,
      progress: String(project?.progress ?? 0),
      selectedStatus: initialMetaStatus,
      selectedPmId: initialPmId,
      noPeriod: false,
    }),
    [
      defaultProjectName,
      initialEndDate,
      initialMetaStatus,
      initialPmId,
      initialStartDate,
      project,
    ]
  );
  const isDirty =
    isEditing &&
    (name !== initialDraft.name ||
      subtitle !== initialDraft.subtitle ||
      description !== initialDraft.description ||
      color !== initialDraft.color ||
      startDate !== initialDraft.startDate ||
      endDate !== initialDraft.endDate ||
      progress !== initialDraft.progress ||
      selectedStatus !== initialDraft.selectedStatus ||
      selectedPmId !== initialDraft.selectedPmId ||
      noPeriod !== initialDraft.noPeriod);
  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: loading,
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  useEffect(() => {
    if (!memberDropdownOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!memberDropdownRef.current?.contains(event.target as Node)) {
        setMemberDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [memberDropdownOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setShowNameError(true);
      setError("프로젝트 이름을 입력해 주세요.");
      return;
    }

    const parsedProgress = Number(progress);
    if (!Number.isFinite(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
      setError("진행률은 0부터 100 사이 숫자로 입력해 주세요.");
      return;
    }

    if (hasDateWarning) {
      setError("마감일이 시작일보다 앞서 있습니다.");
      return;
    }

    const normalizedStartDate = noPeriod ? null : startDate || null;
    const normalizedEndDate = noPeriod ? null : endDate || null;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          color,
          budget: null,
          progress: Math.round(parsedProgress),
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
        }),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const data = (await response.json()) as { project?: ProjectResponse };
      if (!data.project) {
        setError(
          "프로젝트 저장 결과를 확인하지 못했습니다. 다시 시도해 주세요."
        );
        return;
      }

      if (isExistingProject) {
        onSaved?.(data.project);
        if (!onSaved) {
          onClose();
        }
        return;
      }

      onCreated?.(data.project);
      // Success can move to the project detail later if needed.
      // window.location.href = `/projects/${data.project.id}`;
      if (!onCreated) {
        onClose();
      }
    } catch (createError) {
      console.error("[PROJECT_CREATE_MODAL]", createError);
      setError("프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    if (value.trim()) {
      setShowNameError(false);
      if (error === "프로젝트 이름을 입력해 주세요.") {
        setError(null);
      }
    }
  }

  function handleCloseStatusPanel() {
    setSelectedStatus(initialMetaStatus);
    setStatusPanelOpen(false);
  }

  function handleClosePmPanel() {
    setSelectedPmId(null);
    setPmPanelOpen(false);
    setMemberDropdownOpen(false);
  }

  function handleClosePeriodPanel() {
    setStartDate("");
    setEndDate("");
    setNoPeriod(false);
    setPeriodPanelOpen(false);
    if (error === "마감일이 시작일보다 앞서 있습니다.") {
      setError(null);
    }
  }

  if (isExistingProject && project && !isEditing) {
    return (
      <ProjectDetailModal
        isOpen
        projectId={project.id}
        project={project}
        members={members}
        canDelete={canDelete}
        onClose={requestClose}
        onEdit={() => setIsEditing(true)}
        onDeleted={onDeleted}
      />
    );
  }

  return (
    <div className="project-modal-overlay" onClick={handleOverlayClick}>
      <div className="project-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="project-modal-header">
          <div>
            <h2 className="project-modal-title">
              {isExistingProject
                ? "프로젝트 수정하기"
                : "프로젝트 추가하기"}
            </h2>
            <p className="project-modal-desc">
              {isExistingProject
                ? "프로젝트를 수정하고 보드에서 이어서 관리할 수 있습니다."
                : "프로젝트를 등록하고 보드에서 이어서 관리할 수 있습니다."}
            </p>
          </div>
          <button
            type="button"
            className="project-modal-close"
            onClick={requestClose}
            aria-label="프로젝트 추가 모달 닫기"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="project-modal-body">
            <div className="project-modal-left">
              <div className="pm-form-group">
                <label className="pm-label">
                  대표 색상 <span className="pm-required">*</span>
                </label>
                <div className="pm-color-palette">
                  {COLOR_OPTIONS.map((option) => {
                    const isSelected = option === color;

                    return (
                      <button
                        key={option}
                        type="button"
                        className={`pm-color-swatch${isSelected ? " selected" : ""}`}
                        style={{ background: option }}
                        onClick={() => setColor(option)}
                        aria-label={`대표 색상 ${option}`}
                      >
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                          <path
                            d="M1 5l3.5 3.5L11 1"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pm-form-group">
                <label className="pm-label" htmlFor="project-name">
                  프로젝트 이름 <span className="pm-required">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className={`pm-input${showNameError && !name.trim() ? " error" : ""}`}
                  placeholder="예: 2분기 서비스 개선"
                  maxLength={50}
                  autoFocus
                />
                <div className={`pm-char-count${nameCount >= 50 ? " over" : ""}`}>{nameCount} / 50</div>
                <div className={`pm-error${showNameError && !name.trim() ? " show" : ""}`}>
                  프로젝트 이름을 입력해 주세요.
                </div>
              </div>

              {isExistingProject ? (
                <div className="pm-form-group">
                  <label className="pm-label" htmlFor="project-subtitle">
                    한 줄 설명 <span className="pm-optional">선택</span>
                  </label>
                  <input
                    id="project-subtitle"
                    type="text"
                    value={subtitle}
                    onChange={(event) => setSubtitle(event.target.value)}
                    className="pm-input"
                    placeholder="프로젝트를 한 줄로 소개해 주세요"
                    maxLength={120}
                  />
                </div>
              ) : null}

              <div className="pm-form-group">
                <label className="pm-label" htmlFor="project-description">
                  설명 <span className="pm-optional">선택</span>
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="pm-textarea"
                  placeholder="프로젝트를 간단히 소개해 주세요"
                  maxLength={200}
                  rows={3}
                />
                <div className={`pm-char-count${descriptionCount >= 200 ? " over" : ""}`}>
                  {descriptionCount} / 200
                </div>
                <div className="pm-hint">
                  이름과 설명은 등록 후에도 수정할 수 있습니다.
                </div>
              </div>

              {error ? (
                <div className="rounded-[10px] bg-[var(--danger-light)] px-3 py-2 text-[12px] font-medium text-[var(--danger)]">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="project-modal-right">
              <div className="pm-meta-row">
                <div className="pm-meta-label-row">
                  <div className="pm-meta-label">상태</div>
                  <button
                    type="button"
                    className={`pm-field-close${statusPanelOpen ? " show" : ""}`}
                    onClick={handleCloseStatusPanel}
                    title="상태 초기화"
                    aria-label="상태 초기화"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M1 1l8 8M9 1L1 9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                {statusPanelOpen ? (
                  <div className="pm-status-row">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`pm-status-chip ${
                          selectedStatus === option.value ? option.chipClassName : ""
                        }`}
                        onClick={() => setSelectedStatus(option.value)}
                      >
                        <span className="pm-chip-dot" style={{ background: option.dotColor }} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="pm-add-btn" onClick={() => setStatusPanelOpen(true)}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1v10M1 6h10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    추가
                  </button>
                )}
              </div>

              <div className="pm-meta-row">
                <div className="pm-meta-label-row">
                  <div className="pm-meta-label">PM</div>
                  <button
                    type="button"
                    className={`pm-field-close${pmPanelOpen ? " show" : ""}`}
                    onClick={handleClosePmPanel}
                    title="PM 초기화"
                    aria-label="PM 초기화"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M1 1l8 8M9 1L1 9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                {pmPanelOpen ? (
                  <div ref={memberDropdownRef} className="pm-member-wrap">
                    <button
                      type="button"
                      className={`pm-member-display${memberDropdownOpen ? " open" : ""}`}
                      onClick={() => setMemberDropdownOpen((current) => !current)}
                    >
                      {selectedPm ? (
                        <div
                          className="pm-member-avatar"
                          style={{
                            background:
                              MEMBER_AVATAR_COLORS[
                                members.findIndex((member) => member.id === selectedPm.id) %
                                  MEMBER_AVATAR_COLORS.length
                              ]?.background ?? MEMBER_AVATAR_COLORS[0].background,
                            color:
                              MEMBER_AVATAR_COLORS[
                                members.findIndex((member) => member.id === selectedPm.id) %
                                  MEMBER_AVATAR_COLORS.length
                              ]?.color ?? MEMBER_AVATAR_COLORS[0].color,
                          }}
                        >
                          {getInitials(selectedPm.name)}
                        </div>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                          <circle cx="10" cy="7" r="3.5" stroke="#9ca3af" strokeWidth="1.3" />
                          <path
                            d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"
                            stroke="#9ca3af"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                      <span className={`pm-member-name${selectedPm ? "" : " placeholder"}`}>
                        {selectedPm ? getMemberLabel(selectedPm) : "지정 안 함"}
                      </span>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <path
                          d="M3 5l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <div className={`pm-member-dropdown${memberDropdownOpen ? " show" : ""}`}>
                      <button
                        type="button"
                        className={`pm-member-option none${selectedPmId === null ? " selected" : ""}`}
                        onClick={() => {
                          setSelectedPmId(null);
                          setMemberDropdownOpen(false);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                          <circle cx="10" cy="7" r="3.5" stroke="#9ca3af" strokeWidth="1.3" />
                          <path
                            d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"
                            stroke="#9ca3af"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                        지정 안 함
                      </button>
                      {members.map((member, index) => {
                        const palette = MEMBER_AVATAR_COLORS[index % MEMBER_AVATAR_COLORS.length];
                        return (
                          <button
                            key={member.id}
                            type="button"
                            className={`pm-member-option${selectedPmId === member.id ? " selected" : ""}`}
                            onClick={() => {
                              setSelectedPmId(member.id);
                              setMemberDropdownOpen(false);
                            }}
                          >
                            <div
                              className="pm-member-avatar"
                              style={{ background: palette.background, color: palette.color }}
                            >
                              {getInitials(member.name)}
                            </div>
                            {getMemberLabel(member)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pm-hint" style={{ marginTop: 5 }}>
                      등록 후 프로젝트 상세에서도 변경 가능합니다.
                    </div>
                  </div>
                ) : (
                  <button type="button" className="pm-add-btn" onClick={() => setPmPanelOpen(true)}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1v10M1 6h10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    추가
                  </button>
                )}
              </div>

              <div className="pm-meta-row">
                <div className="pm-meta-label-row">
                  <div className="pm-meta-label">기간</div>
                  <button
                    type="button"
                    className={`pm-field-close${periodPanelOpen ? " show" : ""}`}
                    onClick={handleClosePeriodPanel}
                    title="기간 초기화"
                    aria-label="기간 초기화"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M1 1l8 8M9 1L1 9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                {periodPanelOpen ? (
                  <div className="pm-date-grid">
                    <div className="pm-date-line">
                      <span className="pm-date-sub-label">시작</span>
                      <input
                        type="date"
                        className="pm-date-input"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        disabled={noPeriod}
                      />
                    </div>
                    <div className="pm-date-line">
                      <span className="pm-date-sub-label">마감</span>
                      <input
                        type="date"
                        className="pm-date-input"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        disabled={noPeriod}
                      />
                    </div>
                    <div className={`pm-date-warn${hasDateWarning ? " show" : ""}`}>
                      ⚠ 마감일이 시작일보다 앞서 있습니다.
                    </div>
                    <button
                      type="button"
                      className="pm-no-period"
                      onClick={() => {
                        setNoPeriod((current) => {
                          const nextValue = !current;
                          if (nextValue) {
                            setStartDate("");
                            setEndDate("");
                          }
                          return nextValue;
                        });
                      }}
                    >
                      <span className={`pm-checkbox${noPeriod ? " checked" : ""}`}>
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path
                            d="M1 3.5l2.5 2.5L8 1"
                            stroke="#fff"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="pm-no-period-label">
                        기간 없음 (간트차트 미표시)
                      </span>
                    </button>
                  </div>
                ) : (
                  <button type="button" className="pm-add-btn" onClick={() => setPeriodPanelOpen(true)}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1v10M1 6h10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    추가
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="project-modal-footer">
            <button type="button" className="pm-btn pm-btn-ghost" onClick={requestClose} disabled={loading}>
              취소
            </button>
            <button
              type="submit"
              className="pm-btn pm-btn-primary"
              disabled={loading || !name.trim() || hasDateWarning}
            >
              {loading ? <span className="pm-spinner" style={{ display: "block" }} /> : null}
              {loading
                ? "저장 중..."
                : isExistingProject
                  ? "저장"
                  : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
