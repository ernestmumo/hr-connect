// 1. ADDED IMPORTS: We import your central DB reader and the seed data array
import { getAllEmployees } from "@/lib/storage";
import { employees as seedEmployees } from "@/lib/mock-data";

export type ReviewStatus =
  | "Not Started"
  | "Draft Saved"
  | "In Progress"
  | "Submitted";

export type Employee = {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarBg: string;
  department: string;
  reviewer: string;
  dueDate: string;
  lastReview: string;
  defaultScore: number;
  defaultProgress: number;
};

export type DepartmentGoal = {
  id: string;
  status: "ACHIEVED" | "IN PROGRESS" | "OVERDUE";
  title: string;
  description: string;
  progress: number;
  assignedEmployeeIds: string[];
};

export type ReviewFormData = {
  ratings: {
    technical: number;
    delivery: number;
    strategic: number;
  };
  summary: string;
  achievements: string;
  improvements: string;
  futureGoal: string;
};

export type ReviewMeta = {
  status: ReviewStatus;
  updatedAt: string;
  submittedAt?: string;
};

export type FieldErrors = Partial<
  Record<keyof ReviewFormData | "ratings", string>
>;

export const GOALS_STORAGE_KEY = "hr_connect_goals";
export const REVIEW_DRAFTS_KEY = "hr_connect_review_drafts";
export const REVIEW_FINAL_KEY = "hr_connect_review_final";
export const REVIEW_META_KEY = "hr_connect_review_meta";

export const DEFAULT_REVIEW_FORM: ReviewFormData = {
  ratings: { technical: 0, delivery: 0, strategic: 0 },
  summary: "",
  achievements: "",
  improvements: "",
  futureGoal: "",
};

export const VALIDATION_RULES = {
  summaryMin: 50,
  achievementsMin: 30,
  improvementsMin: 30,
  futureGoalMin: 0,
} as const;

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    name: "Jonathan Lee",
    role: "Senior Frontend Engineer",
    initials: "JL",
    avatarBg: "bg-blue-100 text-blue-800",
    department: "ENGINEERING • REMOTE",
    reviewer: "Sarah Jenkins (Manager)",
    dueDate: "Oct 15, 2024",
    lastReview: "Aug 05, 2024",
    defaultScore: 4.8,
    defaultProgress: 92,
  },
  {
    id: "emp-2",
    name: "Sofia Mendez",
    role: "Product Designer",
    initials: "SM",
    avatarBg: "bg-purple-100 text-purple-800",
    department: "DESIGN • SAN FRANCISCO",
    reviewer: "Sarah Jenkins (Manager)",
    dueDate: "Oct 15, 2024",
    lastReview: "Jul 28, 2024",
    defaultScore: 4.5,
    defaultProgress: 85,
  },
  {
    id: "emp-3",
    name: "David Chen",
    role: "Data Scientist",
    initials: "DC",
    avatarBg: "bg-emerald-100 text-emerald-800",
    department: "DATA • NEW YORK",
    reviewer: "Sarah Jenkins (Manager)",
    dueDate: "Oct 18, 2024",
    lastReview: "Aug 10, 2024",
    defaultScore: 3.9,
    defaultProgress: 60,
  },
  {
    id: "emp-4",
    name: "Elena Rodriguez",
    role: "HR Specialist",
    initials: "ER",
    avatarBg: "bg-rose-100 text-rose-800",
    department: "PEOPLE OPS • AUSTIN",
    reviewer: "Sarah Jenkins (Manager)",
    dueDate: "Oct 20, 2024",
    lastReview: "Jul 12, 2024",
    defaultScore: 4.2,
    defaultProgress: 78,
  },
  {
    id: "emp-5",
    name: "Marcus Chen",
    role: "Senior Engineer",
    initials: "MC",
    avatarBg: "bg-slate-200 text-slate-800",
    department: "ENGINEERING • REMOTE",
    reviewer: "Sarah Jenkins (Manager)",
    dueDate: "Oct 22, 2024",
    lastReview: "Aug 01, 2024",
    defaultScore: 4.0,
    defaultProgress: 71,
  },
  {
    id: "emp-6",
    name: "Aisha Patel",
    role: "DevOps Engineer",
    initials: "AP",
    avatarBg: "bg-amber-100 text-amber-800",
    department: "PLATFORM • SEATTLE",
    reviewer: "Sarah Jenkins (Manager)",
    dueDate: "Oct 25, 2024",
    lastReview: "Jun 30, 2024",
    defaultScore: 4.3,
    defaultProgress: 88,
  },
];

export const DEFAULT_GOALS: DepartmentGoal[] = [
  {
    id: "goal-1",
    status: "ACHIEVED",
    title: "Increase System Uptime to 99.9%",
    description: "Core infrastructure optimization project for Q3.",
    progress: 100,
    assignedEmployeeIds: ["emp-1", "emp-5", "emp-6"],
  },
  {
    id: "goal-2",
    status: "IN PROGRESS",
    title: "Automated Payroll Integration",
    description: "Migrate existing manual processes to the new API suite.",
    progress: 65,
    assignedEmployeeIds: ["emp-2", "emp-4"],
  },
  {
    id: "goal-3",
    status: "OVERDUE",
    title: "Security Audit Completion",
    description: "Bi-annual security check and vulnerability assessment.",
    progress: 40,
    assignedEmployeeIds: ["emp-3", "emp-6"],
  },
  {
    id: "goal-4",
    status: "IN PROGRESS",
    title: "Onboarding Refresh",
    description: "Redesigning the first-week experience for new hires.",
    progress: 12,
    assignedEmployeeIds: ["emp-4", "emp-2"],
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeGoal(
  goal: Partial<DepartmentGoal> & { id: string },
): DepartmentGoal {
  return {
    id: goal.id,
    status: (goal.status as DepartmentGoal["status"]) ?? "IN PROGRESS",
    title: goal.title ?? "Untitled Goal",
    description: goal.description ?? "",
    progress: goal.progress ?? 0,
    assignedEmployeeIds: goal.assignedEmployeeIds ?? [],
  };
}

// 2. THE DATA BRIDGE: Fetches global directory database and translates it into the Performance schema
export function getEmployees(): Employee[] {
  // Fetch the unified global employee list from Local Storage
  const globalEmployees = getAllEmployees(seedEmployees);

  // Map the global profiles into the Performance-specific schema
  return globalEmployees.map((globalEmp) => {
    // Check if we have default fallback metrics for this specific ID (for our mock data)
    const defaults = DEFAULT_EMPLOYEES.find((e) => e.id === globalEmp.id);

    // Compute fallback initials if not provided by the directory
    const initials =
      globalEmp.avatarInitials ??
      globalEmp.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    // Compute deterministic avatar background colors for newly onboarded employees
    const bgColors = [
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-emerald-100 text-emerald-800",
      "bg-rose-100 text-rose-800",
      "bg-amber-100 text-amber-800",
    ];
    const avatarBg =
      defaults?.avatarBg ?? bgColors[globalEmp.name.length % bgColors.length];

    return {
      id: globalEmp.id,
      name: globalEmp.name,
      role: globalEmp.role,
      initials: initials,
      avatarBg: avatarBg,
      department: globalEmp.department,
      reviewer: defaults?.reviewer ?? "System Administrator",
      dueDate: defaults?.dueDate ?? "Dec 31, 2026", // Default date for new employees
      lastReview: defaults?.lastReview ?? "Pending",
      defaultScore: defaults?.defaultScore ?? 0,
      defaultProgress: defaults?.defaultProgress ?? 0,
    };
  });
}

// 3. REDIRECTED LOOKUP: Now searches the dynamically generated, globally-synced list
export function getEmployeeById(employeeId: string): Employee | undefined {
  return getEmployees().find((employee) => employee.id === employeeId);
}

export function getGoals(): DepartmentGoal[] {
  const saved = readJson<Partial<DepartmentGoal>[]>(
    GOALS_STORAGE_KEY,
    DEFAULT_GOALS,
  );
  return saved.map((goal) =>
    normalizeGoal(goal as Partial<DepartmentGoal> & { id: string }),
  );
}

export function saveGoals(goals: DepartmentGoal[]) {
  writeJson(GOALS_STORAGE_KEY, goals);
}

export function initializeGoals() {
  const existing = localStorage.getItem(GOALS_STORAGE_KEY);
  if (!existing) {
    saveGoals(DEFAULT_GOALS);
    return DEFAULT_GOALS;
  }

  const goals = getGoals();
  saveGoals(goals);
  return goals;
}

export function assignEmployeeToGoal(goalId: string, employeeId: string) {
  const goals = getGoals().map((goal) => {
    if (goal.id !== goalId) return goal;
    if (goal.assignedEmployeeIds.includes(employeeId)) return goal;
    return {
      ...goal,
      assignedEmployeeIds: [...goal.assignedEmployeeIds, employeeId],
    };
  });
  saveGoals(goals);
  return goals;
}

export function unassignEmployeeFromGoal(goalId: string, employeeId: string) {
  const goals = getGoals().map((goal) => {
    if (goal.id !== goalId) return goal;
    return {
      ...goal,
      assignedEmployeeIds: goal.assignedEmployeeIds.filter(
        (id) => id !== employeeId,
      ),
    };
  });
  saveGoals(goals);
  return goals;
}

export function setGoalAssignments(goalId: string, employeeIds: string[]) {
  const uniqueIds = [...new Set(employeeIds)];
  const goals = getGoals().map((goal) =>
    goal.id === goalId ? { ...goal, assignedEmployeeIds: uniqueIds } : goal,
  );
  saveGoals(goals);
  return goals;
}

export function getEmployeeAssignedGoals(employeeId: string) {
  return getGoals().filter((goal) =>
    goal.assignedEmployeeIds.includes(employeeId),
  );
}

export function getEmployeeGoalProgress(employeeId: string) {
  const assigned = getEmployeeAssignedGoals(employeeId);
  if (assigned.length === 0) {
    const employee = getEmployeeById(employeeId);
    return employee?.defaultProgress ?? 0;
  }
  const total = assigned.reduce((sum, goal) => sum + goal.progress, 0);
  return Math.round(total / assigned.length);
}

function getAllDrafts(): Record<string, ReviewFormData> {
  return readJson<Record<string, ReviewFormData>>(REVIEW_DRAFTS_KEY, {});
}

function getAllFinalReviews(): Record<string, ReviewFormData> {
  return readJson<Record<string, ReviewFormData>>(REVIEW_FINAL_KEY, {});
}

function getAllReviewMeta(): Record<string, ReviewMeta> {
  return readJson<Record<string, ReviewMeta>>(REVIEW_META_KEY, {});
}

function saveAllReviewMeta(meta: Record<string, ReviewMeta>) {
  writeJson(REVIEW_META_KEY, meta);
}

function cloneReviewForm(data: ReviewFormData): ReviewFormData {
  return {
    ...data,
    ratings: { ...data.ratings },
  };
}

export function getReviewDraft(employeeId: string): ReviewFormData | null {
  const draft = getAllDrafts()[employeeId];
  return draft ? cloneReviewForm(draft) : null;
}

export function getFinalReview(employeeId: string): ReviewFormData | null {
  const finalReview = getAllFinalReviews()[employeeId];
  return finalReview ? cloneReviewForm(finalReview) : null;
}

export function getReviewFormForEmployee(employeeId: string): ReviewFormData {
  const finalReview = getFinalReview(employeeId);
  if (finalReview) return finalReview;
  const draft = getReviewDraft(employeeId);
  if (draft) return draft;
  return cloneReviewForm(DEFAULT_REVIEW_FORM);
}

export function getReviewSnapshot(employeeId: string): ReviewFormData {
  const meta = getReviewMeta(employeeId);
  if (meta.status === "Submitted") {
    return getFinalReview(employeeId) ?? cloneReviewForm(DEFAULT_REVIEW_FORM);
  }
  return getReviewDraft(employeeId) ?? cloneReviewForm(DEFAULT_REVIEW_FORM);
}

export function saveReviewDraft(employeeId: string, data: ReviewFormData) {
  const drafts = getAllDrafts();
  drafts[employeeId] = cloneReviewForm(data);
  writeJson(REVIEW_DRAFTS_KEY, drafts);

  const meta = getAllReviewMeta();
  meta[employeeId] = {
    status: "Draft Saved",
    updatedAt: new Date().toISOString(),
    submittedAt: meta[employeeId]?.submittedAt,
  };
  saveAllReviewMeta(meta);
}

export function submitFinalReview(employeeId: string, data: ReviewFormData) {
  const finals = getAllFinalReviews();
  finals[employeeId] = cloneReviewForm(data);
  writeJson(REVIEW_FINAL_KEY, finals);

  const drafts = getAllDrafts();
  // FIXED: Delete the draft from memory instead of saving a new copy
  delete drafts[employeeId];
  writeJson(REVIEW_DRAFTS_KEY, drafts);

  const meta = getAllReviewMeta();
  meta[employeeId] = {
    status: "Submitted",
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
  };
  saveAllReviewMeta(meta);
}

export function deleteReviewDraft(employeeId: string) {
  const drafts = getAllDrafts();
  delete drafts[employeeId];
  writeJson(REVIEW_DRAFTS_KEY, drafts);

  const finals = getAllFinalReviews();
  delete finals[employeeId];
  writeJson(REVIEW_FINAL_KEY, finals);

  const meta = getAllReviewMeta();
  delete meta[employeeId];
  saveAllReviewMeta(meta);
}

export function getReviewMeta(employeeId: string): ReviewMeta {
  const meta = getAllReviewMeta()[employeeId];
  if (meta) return meta;
  return { status: "Not Started", updatedAt: new Date(0).toISOString() };
}

export function hasSavedDraft(employeeId: string): boolean {
  const meta = getReviewMeta(employeeId);
  if (meta.status === "Submitted") return false;
  return getReviewDraft(employeeId) !== null;
}

export function formatReviewUpdatedAt(isoDate: string): string {
  if (!isoDate || isoDate === new Date(0).toISOString()) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoDate));
  } catch {
    return "";
  }
}

export function getDraftUpdatedLabel(employeeId: string): string | null {
  const meta = getReviewMeta(employeeId);
  if (meta.status === "Submitted") return null;
  if (!getReviewDraft(employeeId)) return null;
  return formatReviewUpdatedAt(meta.updatedAt) || null;
}

export function getAverageRating(data: ReviewFormData | null) {
  if (!data) return null;
  const { technical, delivery, strategic } = data.ratings;
  if (!technical || !delivery || !strategic) return null;
  return Number(((technical + delivery + strategic) / 3).toFixed(1));
}

export function getEmployeeScore(employeeId: string) {
  const finalReview = getFinalReview(employeeId);
  const finalScore = getAverageRating(finalReview);
  if (finalScore !== null) return finalScore;

  const draft = getReviewDraft(employeeId);
  const draftScore = getAverageRating(draft);
  if (draftScore !== null) return draftScore;

  return getEmployeeById(employeeId)?.defaultScore ?? 0;
}

export function getLeaderboardRows() {
  return getEmployees().map((employee) => {
    const meta = getReviewMeta(employee.id);
    const submittedAt = meta.submittedAt
      ? new Date(meta.submittedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        })
      : employee.lastReview;

    return {
      ...employee,
      score: getEmployeeScore(employee.id),
      progress: getEmployeeGoalProgress(employee.id),
      lastReview: submittedAt,
      reviewStatus: meta.status,
    };
  });
}

export function validateReviewForm(
  form: ReviewFormData,
  options: { requireFutureGoal?: boolean } = {},
): { isValid: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!form.ratings.technical) {
    errors.ratings = "Rate all three competencies before saving.";
  } else if (!form.ratings.delivery || !form.ratings.strategic) {
    errors.ratings = "Rate all three competencies before saving.";
  }

  if (!form.summary.trim()) {
    errors.summary = "Executive summary is required.";
  } else if (form.summary.trim().length < VALIDATION_RULES.summaryMin) {
    errors.summary = `Executive summary must be at least ${VALIDATION_RULES.summaryMin} characters.`;
  }

  if (!form.achievements.trim()) {
    errors.achievements = "Key achievements are required.";
  } else if (
    form.achievements.trim().length < VALIDATION_RULES.achievementsMin
  ) {
    errors.achievements = `Key achievements must be at least ${VALIDATION_RULES.achievementsMin} characters.`;
  }

  if (!form.improvements.trim()) {
    errors.improvements = "Areas for improvement are required.";
  } else if (
    form.improvements.trim().length < VALIDATION_RULES.improvementsMin
  ) {
    errors.improvements = `Areas for improvement must be at least ${VALIDATION_RULES.improvementsMin} characters.`;
  }

  if (
    options.requireFutureGoal &&
    form.futureGoal.trim() &&
    form.futureGoal.trim().length < 10
  ) {
    errors.futureGoal =
      "Future goal must be at least 10 characters if provided.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function isRatingsComplete(form: ReviewFormData) {
  return (
    form.ratings.technical > 0 &&
    form.ratings.delivery > 0 &&
    form.ratings.strategic > 0
  );
}

export function isNarrativeComplete(form: ReviewFormData) {
  return (
    form.summary.trim().length >= VALIDATION_RULES.summaryMin &&
    form.achievements.trim().length >= VALIDATION_RULES.achievementsMin &&
    form.improvements.trim().length >= VALIDATION_RULES.improvementsMin
  );
}

export function getSubmissionProgress(form: ReviewFormData) {
  const sections = [true, isRatingsComplete(form), isNarrativeComplete(form)];
  const completed = sections.filter(Boolean).length;
  return Math.round((completed / sections.length) * 100);
}

export function formsEqual(a: ReviewFormData, b: ReviewFormData) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function migrateLegacyReviewStorage() {
  if (typeof window === "undefined") return;

  const legacy = localStorage.getItem("hr_connect_performance_reviews");
  if (!legacy) return;

  try {
    const parsed = JSON.parse(legacy) as Record<string, ReviewFormData>;
    const drafts = getAllDrafts();
    const meta = getAllReviewMeta();

    Object.entries(parsed).forEach(([employeeId, data]) => {
      if (!drafts[employeeId]) {
        drafts[employeeId] = cloneReviewForm({
          ...DEFAULT_REVIEW_FORM,
          ...data,
        });
        meta[employeeId] = {
          status: "Draft Saved",
          updatedAt: new Date().toISOString(),
        };
      }
    });

    writeJson(REVIEW_DRAFTS_KEY, drafts);
    saveAllReviewMeta(meta);
    localStorage.removeItem("hr_connect_performance_reviews");
  } catch {
    // ignore invalid legacy payloads
  }
}
