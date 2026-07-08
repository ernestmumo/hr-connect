// 1. DATABASE BRIDGE IMPORTS: Pulls your central employee directory
import { getAllEmployees } from "@/lib/storage";
import { employees as seedEmployees } from "@/lib/mock-data";

// 2. UPDATED DRAFT SCHEMA: We replaced employeeName and employeeRole with employeeId
export type LeaveDraft = {
  employeeId: string; // Relational foreign key pointer
  leaveType: string;
  urgency: string;
  startDate: string;
  endDate: string;
  reason: string;
  uploadedFile: string | null;
};

export type SavedLeaveDraft = {
  id: string;
  data: LeaveDraft;
  createdAt: string;
  updatedAt: string;
};

// 3. INTERNAL STORAGE SCHEMA: What we actually save to Local Storage (No names or roles!)
export type StoredLeaveRequest = {
  id: string;
  employeeId: string; // Relational foreign key
  leaveType: string;
  typeColor: string;
  dates: string;
  duration: string;
  status: string;
  // Legacy fields retained temporarily so old mock data doesn't crash during migration
  name?: string;
  role?: string;
  initials?: string;
  avatarBg?: string;
};

// 4. HYDRATED UI SCHEMA: What we send to your Dashboard Table to render
export type LeaveRequest = {
  id: string;
  employeeId: string;
  name: string; // Injected dynamically from central DB
  role: string; // Injected dynamically from central DB
  initials: string; // Injected dynamically from central DB
  avatarBg: string; // Injected dynamically from central DB
  leaveType: string;
  typeColor: string;
  dates: string;
  duration: string;
  status: string;
};

export type FieldErrors = Partial<Record<keyof LeaveDraft, string>>;

export const LEAVE_DRAFTS_KEY = "hr_connect_leave_drafts";
export const LEAVE_REQUESTS_KEY = "hr_connect_leave_requests";

/** @deprecated Legacy single-draft key — migrated on init */
const LEGACY_LEAVE_DRAFT_KEY = "hr_connect_leave_draft";
/** @deprecated Legacy single-draft meta — migrated on init */
const LEGACY_LEAVE_META_KEY = "hr_connect_leave_meta";

export const DEFAULT_LEAVE_DRAFT: LeaveDraft = {
  employeeId: "", // Starts blank, waiting for dropdown selection
  leaveType: "",
  urgency: "Standard",
  startDate: "",
  endDate: "",
  reason: "",
  uploadedFile: null,
};

export const VALIDATION_RULES = {
  reasonMin: 30,
} as const;

const AVATAR_BACKGROUNDS = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-emerald-100 text-emerald-800",
  "bg-slate-200 text-slate-800",
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
];

export const LEAVE_TYPE_MAP: Record<
  string,
  { label: string; typeColor: string }
> = {
  ANNUAL: { label: "Annual Leave", typeColor: "bg-blue-500" },
  SICK: { label: "Sick Leave", typeColor: "bg-rose-500" },
  PERSONAL: { label: "Personal Leave", typeColor: "bg-slate-400" },
  MATERNITY: { label: "Maternity Leave", typeColor: "bg-slate-400" },
};

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
  localStorage.setItem(key, JSON.stringify(value));
}

function cloneDraft(data: LeaveDraft): LeaveDraft {
  return { ...data };
}

function createDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getAllLeaveDraftsRaw(): SavedLeaveDraft[] {
  return readJson<SavedLeaveDraft[]>(LEAVE_DRAFTS_KEY, []);
}

function saveAllLeaveDrafts(drafts: SavedLeaveDraft[]) {
  writeJson(LEAVE_DRAFTS_KEY, drafts);
}

export function isLeaveDraftEmpty(form: LeaveDraft) {
  return (
    !form.employeeId &&
    !(form as any).employeeName && // Legacy check
    !form.leaveType &&
    !form.startDate &&
    !form.endDate &&
    !form.reason.trim() &&
    !form.uploadedFile
  );
}

export function formsEqual(a: LeaveDraft, b: LeaveDraft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getLeaveDrafts(): SavedLeaveDraft[] {
  return getAllLeaveDraftsRaw().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getLeaveDraftById(draftId: string): SavedLeaveDraft | null {
  return getAllLeaveDraftsRaw().find((draft) => draft.id === draftId) ?? null;
}

export function hasSavedLeaveDrafts(): boolean {
  return getLeaveDrafts().length > 0;
}

/** @deprecated Use hasSavedLeaveDrafts */
export function hasSavedLeaveDraft(): boolean {
  return hasSavedLeaveDrafts();
}

export function formatLeaveUpdatedAt(isoDate: string): string {
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

export function getLeaveDraftUpdatedLabel(draftId: string): string | null {
  const draft = getLeaveDraftById(draftId);
  if (!draft) return null;
  return formatLeaveUpdatedAt(draft.updatedAt) || null;
}

// 5. HYDRATION: Translates Draft objects for the dashboard previews using real-time employee lookup
export function getLeaveDraftSummary(draft: SavedLeaveDraft): {
  title: string;
  subtitle: string;
  datesLabel: string | null;
} {
  const { data } = draft;
  const allEmployees = getAllEmployees(seedEmployees);

  // Find employee by ID, or fallback to legacy hardcoded name
  const legacyName = (data as any).employeeName;
  const employee =
    allEmployees.find((e) => e.id === data.employeeId) ||
    allEmployees.find((e) => e.name === legacyName);

  const name = employee?.name || legacyName || "Untitled application";
  const typeLabel = data.leaveType
    ? (LEAVE_TYPE_MAP[data.leaveType]?.label ?? data.leaveType)
    : "Leave type not set";
  const role = employee?.role || (data as any).employeeRole || "";

  let datesLabel: string | null = null;
  if (data.startDate && data.endDate) {
    datesLabel = formatDateRange(data.startDate, data.endDate);
  } else if (data.startDate) {
    datesLabel = `From ${new Date(data.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  return {
    title: name,
    subtitle: role ? `${role} · ${typeLabel}` : typeLabel,
    datesLabel,
  };
}

export function saveLeaveDraft(
  data: LeaveDraft,
  draftId?: string | null,
): string {
  const payload = cloneDraft(data);
  const drafts = getAllLeaveDraftsRaw();
  const now = new Date().toISOString();

  if (draftId) {
    const index = drafts.findIndex((draft) => draft.id === draftId);
    if (index >= 0) {
      drafts[index] = {
        ...drafts[index],
        data: payload,
        updatedAt: now,
      };
      saveAllLeaveDrafts(drafts);
      return draftId;
    }
  }

  const newDraft: SavedLeaveDraft = {
    id: createDraftId(),
    data: payload,
    createdAt: now,
    updatedAt: now,
  };
  drafts.push(newDraft);
  saveAllLeaveDrafts(drafts);
  return newDraft.id;
}

export function deleteLeaveDraft(draftId: string) {
  const drafts = getAllLeaveDraftsRaw().filter((draft) => draft.id !== draftId);
  saveAllLeaveDrafts(drafts);
}

// 6. VALIDATION UPDATE: Ensure employeeId is captured instead of text fields
export function validateLeaveForm(form: LeaveDraft): {
  isValid: boolean;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};

  if (!form.employeeId) {
    errors.employeeId = "Please select an employee from the directory.";
  }

  if (!form.leaveType) {
    errors.leaveType = "Please select a leave type.";
  }

  if (!form.urgency) {
    errors.urgency = "Please select an urgency level.";
  }

  if (!form.startDate) {
    errors.startDate = "Start date is required.";
  }

  if (!form.endDate) {
    errors.endDate = "End date is required.";
  } else if (
    form.startDate &&
    new Date(form.endDate) < new Date(form.startDate)
  ) {
    errors.endDate = "End date cannot be before start date.";
  }

  const reason = form.reason.trim();
  if (!reason) {
    errors.reason = "Reason for leave is required.";
  } else if (reason.length < VALIDATION_RULES.reasonMin) {
    errors.reason = `Provide at least ${VALIDATION_RULES.reasonMin} characters describing your reason.`;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function pickAvatarBg(name: string) {
  const index = name.length % AVATAR_BACKGROUNDS.length;
  return AVATAR_BACKGROUNDS[index];
}

export function formatDateRange(start: string, end: string) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const startLabel = new Date(start).toLocaleDateString("en-US", options);
  const endLabel = new Date(end).toLocaleDateString("en-US", options);
  return `${startLabel} - ${endLabel}`;
}

export function calculateDuration(start: string, end: string) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const days = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  return days === 1 ? "1 Day" : `${days} Days`;
}

// 7. REAL-TIME HYDRATION ENGINE: Combines Local Storage Leave IDs with active Profile Database
export function getLeaveRequests(): LeaveRequest[] {
  const stored = readJson<StoredLeaveRequest[]>(LEAVE_REQUESTS_KEY, []);
  const allEmployees = getAllEmployees(seedEmployees);

  return stored.map((req) => {
    // Locate the matching employee profile in real-time
    const employee =
      allEmployees.find((e) => e.id === req.employeeId) ||
      allEmployees.find((e) => e.name === req.name);

    // Dynamically calculate fresh avatar data based on active name
    const computedName = employee?.name || req.name || "Unknown Employee";
    const initials =
      employee?.avatarInitials ??
      computedName
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    const avatarBg = employee
      ? pickAvatarBg(employee.name)
      : req.avatarBg || "bg-slate-200 text-slate-800";

    return {
      id: req.id,
      employeeId: employee?.id || req.employeeId || "unknown",
      name: computedName, // DYNAMIC: Always current name
      role: employee?.role || req.role || "", // DYNAMIC: Always current role
      initials,
      avatarBg,
      leaveType: req.leaveType,
      typeColor: req.typeColor,
      dates: req.dates,
      duration: req.duration,
      status: req.status,
    };
  });
}

// 8. RELATIONAL BUILDER: Writes ONLY the relational ID to the database when submitting
export function buildLeaveRequest(data: LeaveDraft): StoredLeaveRequest {
  const typeMeta = LEAVE_TYPE_MAP[data.leaveType];
  return {
    id: `req-${Date.now()}`,
    employeeId: data.employeeId, // Relational pointer
    leaveType: typeMeta?.label ?? data.leaveType,
    typeColor: typeMeta?.typeColor ?? "bg-slate-400",
    dates: formatDateRange(data.startDate, data.endDate),
    duration: calculateDuration(data.startDate, data.endDate),
    status: "Pending",
  };
}

export function submitLeaveRequest(
  data: LeaveDraft,
  draftId?: string | null,
): LeaveRequest {
  const newRequest = buildLeaveRequest(data);
  const existing = readJson<StoredLeaveRequest[]>(LEAVE_REQUESTS_KEY, []);

  writeJson(LEAVE_REQUESTS_KEY, [newRequest, ...existing]);

  if (draftId) {
    deleteLeaveDraft(draftId);
  }

  // Return hydrated request for immediate UI rendering if needed
  return getLeaveRequests().find((r) => r.id === newRequest.id) as LeaveRequest;
}

function migrateLegacyLeaveDraft() {
  const legacy = readJson<Partial<LeaveDraft> | null>(
    LEGACY_LEAVE_DRAFT_KEY,
    null,
  );
  if (!legacy) {
    localStorage.removeItem(LEGACY_LEAVE_DRAFT_KEY);
    localStorage.removeItem(LEGACY_LEAVE_META_KEY);
    return;
  }

  const merged = { ...DEFAULT_LEAVE_DRAFT, ...legacy };
  if (isLeaveDraftEmpty(merged as LeaveDraft)) {
    localStorage.removeItem(LEGACY_LEAVE_DRAFT_KEY);
    localStorage.removeItem(LEGACY_LEAVE_META_KEY);
    return;
  }

  const legacyMeta = readJson<{ updatedAt?: string } | null>(
    LEGACY_LEAVE_META_KEY,
    null,
  );
  const timestamp = legacyMeta?.updatedAt ?? new Date().toISOString();
  const drafts = getAllLeaveDraftsRaw();

  drafts.push({
    id: createDraftId(),
    data: merged as LeaveDraft,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  saveAllLeaveDrafts(drafts);
  localStorage.removeItem(LEGACY_LEAVE_DRAFT_KEY);
  localStorage.removeItem(LEGACY_LEAVE_META_KEY);
}

export function initializeLeaveDraftStorage() {
  migrateLegacyLeaveDraft();
}

export function getLeaveDraft(): LeaveDraft {
  const drafts = getLeaveDrafts();
  if (drafts.length === 0) return cloneDraft(DEFAULT_LEAVE_DRAFT);
  return cloneDraft(drafts[0].data);
}

export function clearLeaveDraft() {
  saveAllLeaveDrafts([]);
}
