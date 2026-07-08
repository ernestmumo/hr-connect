import { Employee } from "@/lib/mock-data";

const NEW_EMPLOYEES_KEY = "hr-connect:employees";
const OVERRIDES_KEY = "hr-connect:employee-overrides";
const ONBOARDING_DRAFT_KEY = "hr-connect:onboarding-draft";

export function getStoredEmployees(): Employee[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NEW_EMPLOYEES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEmployee(employee: Employee) {
  const current = getStoredEmployees();
  const existingIndex = current.findIndex((item) => item.id === employee.id);
  const next =
    existingIndex >= 0
      ? current.map((item, index) =>
          index === existingIndex ? employee : item,
        )
      : [...current, employee];

  localStorage.setItem(NEW_EMPLOYEES_KEY, JSON.stringify(next));
}

function getOverrides(): Record<string, Partial<Employee>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function updateEmployee(id: string, changes: Partial<Employee>) {
  const overrides = getOverrides();
  overrides[id] = { ...overrides[id], ...changes };
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function getAllEmployees(seedEmployees: Employee[]): Employee[] {
  const overrides = getOverrides();
  const stored = getStoredEmployees();
  const merged = [...seedEmployees, ...stored].map((emp) => ({
    ...emp,
    ...(overrides[emp.id] ?? {}),
  }));
  return merged;
}

export function getStoredOnboardingDraft<T>(fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveOnboardingDraft(data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(data));
}

export function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_DRAFT_KEY);
}
