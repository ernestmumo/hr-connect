"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  FileUp,
  ChevronRight,
  RefreshCw,
  Info,
  ClipboardList,
  Check,
  Eye,
  Pencil,
} from "lucide-react";

import {
  DEFAULT_LEAVE_DRAFT,
  deleteLeaveDraft,
  FieldErrors,
  formsEqual,
  getLeaveDraftById,
  getLeaveDraftUpdatedLabel,
  initializeLeaveDraftStorage,
  saveLeaveDraft,
  submitLeaveRequest,
  validateLeaveForm,
  VALIDATION_RULES,
  type LeaveDraft,
} from "@/lib/leave-store";

// 1. ADDED DATABASE IMPORTS: Pulls the central employee directory
import { getAllEmployees } from "@/lib/storage";
import { employees as seedEmployees, type Employee } from "@/lib/mock-data";

export default function ApplyForLeavePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center text-sm text-slate-500">
          Loading application form...
        </div>
      }
    >
      <ApplyForLeaveContent />
    </Suspense>
  );
}

function ApplyForLeaveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const draftId = searchParams.get("draft");
  const isViewDraft = mode === "view";
  const isReadOnly = isViewDraft;
  const isNewApplication = !draftId;

  // 2. ACTIVE EMPLOYEES STATE: Stores the live directory array for the dropdown
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);

  const [savedSnapshot, setSavedSnapshot] =
    useState<LeaveDraft>(DEFAULT_LEAVE_DRAFT);

  // 3. RELATIONAL FOREIGN KEY STATE: We replaced employeeName and employeeRole with employeeId
  const [employeeId, setEmployeeId] = useState("");

  const [leaveType, setLeaveType] = useState("");
  const [urgency, setUrgency] = useState("Standard");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Today, 09:42 AM");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const applyDraft = useCallback((draft: LeaveDraft) => {
    setEmployeeId(draft.employeeId || ""); // Map foreign key
    setLeaveType(draft.leaveType);
    setUrgency(draft.urgency);
    setStartDate(draft.startDate);
    setEndDate(draft.endDate);
    setReason(draft.reason);
    setUploadedFile(draft.uploadedFile);
    setSavedSnapshot({ ...draft });
  }, []);

  useEffect(() => {
    // 4. LOAD THE GLOBAL DIRECTORY ON MOUNT
    setActiveEmployees(getAllEmployees(seedEmployees));

    initializeLeaveDraftStorage();

    if (isViewDraft && !draftId) {
      router.replace("/leave");
      return;
    }

    if (draftId) {
      const saved = getLeaveDraftById(draftId);
      if (saved) {
        applyDraft(saved.data);
      } else if (isViewDraft) {
        router.replace("/leave");
        return;
      } else {
        applyDraft({ ...DEFAULT_LEAVE_DRAFT });
      }
    } else {
      applyDraft({ ...DEFAULT_LEAVE_DRAFT });
    }

    setIsLoaded(true);
  }, [applyDraft, draftId, isViewDraft, router]);

  // 5. AUTO-POPULATE HOOK: Finds the currently selected employee and extracts their role
  const selectedEmployeeObj = activeEmployees.find((e) => e.id === employeeId);
  const derivedRole = selectedEmployeeObj?.role || "";

  const getCurrentForm = useCallback(
    (): LeaveDraft => ({
      employeeId,
      leaveType,
      urgency,
      startDate,
      endDate,
      reason,
      uploadedFile,
    }),
    [employeeId, leaveType, urgency, startDate, endDate, reason, uploadedFile],
  );

  const checkIsFormDirty = useCallback(() => {
    return !formsEqual(getCurrentForm(), savedSnapshot);
  }, [getCurrentForm, savedSnapshot]);

  const resetFormToSaved = useCallback(() => {
    applyDraft(savedSnapshot);
  }, [applyDraft, savedSnapshot]);

  const clearFieldError = useCallback((field: keyof LeaveDraft) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSaveDraft = useCallback((): boolean => {
    const payload = getCurrentForm();
    const { isValid, errors } = validateLeaveForm(payload);

    if (!isValid) {
      setFieldErrors(errors);
      window.alert(
        "Please complete all required fields correctly before saving a draft.",
      );
      return false;
    }

    const savedId = saveLeaveDraft(payload, draftId);
    setSavedSnapshot({ ...payload });
    setFieldErrors({});

    if (!draftId) {
      router.replace(`/leave/apply?draft=${savedId}`);
    }

    window.alert(
      "Draft saved. You can return to finish this application later.",
    );
    return true;
  }, [getCurrentForm, draftId, router]);

  const handleSubmitApplication = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      const payload = isReadOnly
        ? draftId
          ? getLeaveDraftById(draftId)?.data
          : null
        : getCurrentForm();

      if (!payload) {
        window.alert("No saved application data to submit.");
        return;
      }

      const { isValid, errors } = validateLeaveForm(payload);

      if (!isValid) {
        setFieldErrors(errors);
        window.alert(
          "Please complete all required fields correctly before submitting.",
        );
        return;
      }

      const newRequest = submitLeaveRequest(payload, draftId);
      setFieldErrors({});

      window.alert(
        `Leave application submitted for ${newRequest.name}. It is now pending approval on the Leave Management dashboard.`,
      );
      router.push("/leave");
    },
    [isReadOnly, getCurrentForm, draftId, router],
  );

  const handleEditDraft = useCallback(() => {
    if (!draftId) {
      router.push("/leave/apply");
      return;
    }
    router.push(`/leave/apply?draft=${draftId}`);
  }, [draftId, router]);

  const handleViewDraft = useCallback(() => {
    if (!draftId) return;
    router.push(`/leave/apply?draft=${draftId}&mode=view`);
  }, [draftId, router]);

  const handleDeleteSavedDraft = useCallback(() => {
    if (!draftId) return;

    const confirmed = window.confirm(
      "Delete this saved leave application draft? This cannot be undone.",
    );
    if (!confirmed) return;

    deleteLeaveDraft(draftId);
    setFieldErrors({});
    window.alert("Saved draft deleted.");
    router.push("/leave");
  }, [draftId, router]);

  const attemptNavigation = useCallback(
    (href: string) => {
      if (!isReadOnly && checkIsFormDirty()) {
        setPendingNavigation(href);
        setShowUnsavedModal(true);
        return;
      }
      router.push(href);
    },
    [checkIsFormDirty, router, isReadOnly],
  );

  const completePendingNavigation = useCallback(() => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setPendingNavigation(null);
    setShowUnsavedModal(false);
  }, [pendingNavigation, router]);

  const handleSaveAndLeave = () => {
    const saved = handleSaveDraft();
    if (saved) {
      completePendingNavigation();
    }
  };

  const handleDiscardAndLeave = () => {
    resetFormToSaved();
    completePendingNavigation();
  };

  const handleDiscardChanges = () => {
    if (!checkIsFormDirty()) return;
    const confirmed = window.confirm(
      "Discard unsaved changes and revert to your last saved draft?",
    );
    if (!confirmed) return;
    resetFormToSaved();
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isReadOnly && checkIsFormDirty()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [checkIsFormDirty, isReadOnly]);

  const handleSimulateUpload = () => {
    if (isReadOnly) return;
    setUploadedFile("medical_certificate.pdf");
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    setUploadedFile(null);
  };

  const handleRefreshBalance = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    setTimeout(() => {
      setLastUpdated("Today, 03:28 PM");
      setIsRefreshing(false);
    }, 800);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center text-sm text-slate-500">
        Loading application form...
      </div>
    );
  }

  const isDirty = !isReadOnly && checkIsFormDirty();
  const activeSavedDraft = draftId ? getLeaveDraftById(draftId) : null;
  const savedDraftExists = Boolean(activeSavedDraft);
  const draftUpdatedLabel = draftId ? getLeaveDraftUpdatedLabel(draftId) : null;
  const viewDraftEmpty = isViewDraft && !savedDraftExists;
  const pageTitle = isViewDraft
    ? "Saved Leave Draft"
    : isNewApplication
      ? "New Leave Application"
      : "Continue Leave Application";

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-900">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => attemptNavigation("/leave")}
          className="hover:text-slate-600 transition-colors cursor-pointer"
        >
          Leave Management
        </button>
        <span className="text-slate-300 font-normal">&gt;</span>
        <span className="text-slate-500">
          {isViewDraft
            ? "Draft Preview"
            : isNewApplication
              ? "New Application"
              : "Edit Draft"}
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            {isViewDraft
              ? "Read-only preview of your saved leave application. Edit or submit when you are ready."
              : isNewApplication
                ? "Start a fresh leave request. Save as draft to keep it, then start another application anytime from the dashboard."
                : "Continue this saved application, or start a new one without losing your other drafts."}
          </p>
          {!isReadOnly && isDirty && (
            <p className="text-xs font-semibold text-amber-600">
              Unsaved changes — save your draft before leaving this page.
            </p>
          )}
          {!isReadOnly && savedDraftExists && !isDirty && (
            <p className="text-xs font-semibold text-blue-600">
              Saved draft restored
              {draftUpdatedLabel ? ` (last updated ${draftUpdatedLabel})` : ""}.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isViewDraft && (
            <>
              <button
                type="button"
                onClick={handleEditDraft}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmitApplication()}
                disabled={viewDraftEmpty}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#0f172a] rounded-lg hover:bg-slate-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Submit Application</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </>
          )}
          {!isReadOnly && (
            <>
              {savedDraftExists && (
                <button
                  type="button"
                  onClick={handleViewDraft}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Saved Draft
                </button>
              )}
              <button
                type="button"
                onClick={() => attemptNavigation("/leave/apply")}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
              >
                New Application
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmitApplication()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#0f172a] rounded-lg hover:bg-slate-800 cursor-pointer active:scale-95 transition-all"
              >
                <span>Submit Application</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {isViewDraft && !viewDraftEmpty && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Eye className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Viewing saved draft</p>
            <p className="text-xs text-amber-800 mt-0.5">
              {draftUpdatedLabel
                ? `Last saved ${draftUpdatedLabel}.`
                : "This is a read-only preview of your saved application."}{" "}
              Use Edit Draft to make changes, or Submit Application when ready.
            </p>
          </div>
        </div>
      )}

      {viewDraftEmpty && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          No saved draft found.{" "}
          <button
            type="button"
            onClick={() => attemptNavigation("/leave/apply")}
            className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Start a new application
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <form
            onSubmit={handleSubmitApplication}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 6. DYNAMIC EMPLOYEE SELECTOR (Replaces text input) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="employeeId"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Employee *
                </label>
                <div className="relative">
                  <select
                    id="employeeId"
                    required
                    disabled={isReadOnly}
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      clearFieldError("employeeId" as keyof LeaveDraft);
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50 cursor-pointer appearance-none font-semibold text-slate-700 ${
                      fieldErrors.employeeId
                        ? "border-rose-300 focus:border-rose-500"
                        : "border-slate-200"
                    } ${isReadOnly ? "cursor-default bg-slate-50" : ""}`}
                  >
                    <option value="" disabled>
                      Select an employee...
                    </option>
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                {fieldErrors.employeeId && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {fieldErrors.employeeId}
                  </p>
                )}
              </div>

              {/* 7. AUTO-POPULATED READ-ONLY ROLE FIELD */}
              <div className="space-y-1.5">
                <label
                  htmlFor="employeeRole"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Job Title
                </label>
                <input
                  id="employeeRole"
                  type="text"
                  readOnly
                  value={derivedRole}
                  placeholder="Auto-populated from directory"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none bg-slate-100 font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="leaveType"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Leave Type *
                </label>
                <div className="relative">
                  <select
                    id="leaveType"
                    required
                    disabled={isReadOnly}
                    value={leaveType}
                    onChange={(e) => {
                      setLeaveType(e.target.value);
                      clearFieldError("leaveType");
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50 cursor-pointer appearance-none font-semibold text-slate-700 ${
                      fieldErrors.leaveType
                        ? "border-rose-300 focus:border-rose-500"
                        : "border-slate-200"
                    } ${isReadOnly ? "cursor-default bg-slate-50" : ""}`}
                  >
                    <option value="" disabled>
                      Select a leave category
                    </option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="PERSONAL">Personal Leave</option>
                    <option value="MATERNITY">Parental Leave</option>
                  </select>
                  <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                {fieldErrors.leaveType && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {fieldErrors.leaveType}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Urgency *
                </span>
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-lg h-[42px] items-center">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      setUrgency("Standard");
                      clearFieldError("urgency");
                    }}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      isReadOnly ? "cursor-default" : "cursor-pointer"
                    } ${
                      urgency === "Standard"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      setUrgency("Urgent");
                      clearFieldError("urgency");
                    }}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      isReadOnly ? "cursor-default" : "cursor-pointer"
                    } ${
                      urgency === "Urgent"
                        ? "bg-white text-rose-600 shadow-xs border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Urgent
                  </button>
                </div>
                {fieldErrors.urgency && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {fieldErrors.urgency}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="startDate"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Start Date *
                </label>
                <input
                  id="startDate"
                  type="date"
                  required
                  readOnly={isReadOnly}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    clearFieldError("startDate");
                    clearFieldError("endDate");
                  }}
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50 font-semibold text-slate-700 cursor-pointer ${
                    fieldErrors.startDate
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-slate-200"
                  } ${isReadOnly ? "cursor-default bg-slate-50" : ""}`}
                />
                {fieldErrors.startDate && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="endDate"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  End Date *
                </label>
                <input
                  id="endDate"
                  type="date"
                  required
                  readOnly={isReadOnly}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    clearFieldError("endDate");
                  }}
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50 font-semibold text-slate-700 cursor-pointer ${
                    fieldErrors.endDate
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-slate-200"
                  } ${isReadOnly ? "cursor-default bg-slate-50" : ""}`}
                />
                {fieldErrors.endDate && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {fieldErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                <label htmlFor="reason">Reason for Leave *</label>
                <span className="text-[10px] text-slate-400 font-semibold lowercase">
                  {reason.trim().length} / 2000 · min{" "}
                  {VALIDATION_RULES.reasonMin}
                </span>
              </div>
              <textarea
                id="reason"
                required
                readOnly={isReadOnly}
                maxLength={2000}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  clearFieldError("reason");
                }}
                placeholder="Briefly describe the reason for your leave request..."
                rows={4}
                className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/20 resize-none font-semibold text-slate-700 leading-relaxed ${
                  fieldErrors.reason
                    ? "border-rose-300 focus:border-rose-500"
                    : "border-slate-200"
                } ${isReadOnly ? "cursor-default bg-slate-50" : ""}`}
              />
              {fieldErrors.reason && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {fieldErrors.reason}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Supporting Documents
              </span>
              <div
                onClick={handleSimulateUpload}
                className={`border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center space-y-3 transition-colors ${
                  isReadOnly
                    ? "cursor-default"
                    : "cursor-pointer hover:bg-slate-50"
                }`}
              >
                {!uploadedFile ? (
                  <>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800">
                        {isReadOnly
                          ? "No supporting document attached"
                          : "Click to upload or drag and drop"}
                      </h4>
                      {!isReadOnly && (
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Medical certificates, travel docs (Max 10MB)
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold animate-in zoom-in-95 duration-200">
                    <span>{uploadedFile}</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                        title="Remove file"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    Discard Unsaved Changes
                  </button>
                  {draftId && savedDraftExists && (
                    <button
                      type="button"
                      onClick={handleDeleteSavedDraft}
                      className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Delete Saved Draft
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {savedDraftExists && (
                    <button
                      type="button"
                      onClick={handleViewDraft}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer transition-all active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Saved Draft
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#0f172a] rounded-lg hover:bg-slate-800 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>Submit Application</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {isViewDraft && !viewDraftEmpty && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={handleEditDraft}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitApplication()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#0f172a] rounded-lg hover:bg-slate-800 cursor-pointer active:scale-95 transition-all"
                >
                  <span>Submit Application</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-[#0b1329] text-white p-6 rounded-xl border border-slate-800/80 shadow-lg flex flex-col justify-between h-[450px] relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="absolute -right-4 -top-4 pointer-events-none text-slate-800/30 rotate-12 z-0">
              <ClipboardList className="w-28 h-28 stroke-[1]" />
            </div>

            <div className="relative z-10">
              <h2 className="text-base font-bold tracking-tight text-white">
                Leave Balance
              </h2>
            </div>

            <div className="space-y-3.5 my-2 relative z-10">
              <div className="bg-white/[0.04] border border-white/[0.08] p-4 rounded-xl flex flex-col space-y-2 backdrop-blur-md shadow-md shadow-black/20 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                <div className="flex items-baseline justify-between text-xs font-semibold text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Annual Leave
                  </span>
                  <span className="text-white font-bold">
                    <span className="text-base">14.5</span> Days
                  </span>
                </div>
                <div className="w-full bg-slate-950/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-300/80 rounded-full"
                    style={{ width: "48%" }}
                  />
                </div>
                <div className="text-[9px] text-slate-400 font-semibold">
                  Expires in 122 days
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] p-4 rounded-xl flex flex-col space-y-2 backdrop-blur-md shadow-md shadow-black/20 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                <div className="flex items-baseline justify-between text-xs font-semibold text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Sick Leave
                  </span>
                  <span className="text-white font-bold">
                    <span className="text-base">08</span> Days
                  </span>
                </div>
                <div className="w-full bg-slate-950/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: "53%" }}
                  />
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] p-4 rounded-xl flex flex-col space-y-2 backdrop-blur-md shadow-md shadow-black/20 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                <div className="flex items-baseline justify-between text-xs font-semibold text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Personal Leave
                  </span>
                  <span className="text-white font-bold">
                    <span className="text-base">03</span> Days
                  </span>
                </div>
                <div className="w-full bg-slate-950/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400/50 rounded-full"
                    style={{ width: "20%" }}
                  />
                </div>
              </div>
            </div>

            <div className="-mx-6 -mb-6 bg-slate-950/30 border-t border-slate-800/60 px-6 py-4 flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-2 relative z-10">
              <span>Last updated: {lastUpdated}</span>
              <button
                type="button"
                onClick={handleRefreshBalance}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer active:scale-95 text-slate-400"
                title="Refresh balances"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Info className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-800">
                Company Guidelines
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Requests for more than 5 days must be submitted{" "}
                  <span className="font-bold text-slate-800">2 weeks</span> in
                  advance.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Medical certificate is{" "}
                  <span className="font-bold text-slate-800">mandatory</span>{" "}
                  for sick leave exceeding 2 consecutive days.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Approval usually takes{" "}
                  <span className="font-bold text-slate-800">24-48 hours</span>{" "}
                  from your direct manager.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-all cursor-pointer active:scale-95 text-center mt-2"
            >
              View Full Policy
            </button>
          </div>
        </div>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl border border-slate-100 shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Unsaved Changes
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              You have unsaved changes on this leave application. Save your
              draft before leaving, or discard the changes and continue.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingNavigation(null);
                  setShowUnsavedModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardAndLeave}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Discard & Leave
              </button>
              <button
                type="button"
                onClick={handleSaveAndLeave}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Save & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
