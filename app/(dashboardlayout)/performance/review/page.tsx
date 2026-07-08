"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Star, FileText, Flag, Plus, Eye, Pencil } from "lucide-react";
import {
  assignEmployeeToGoal,
  DEFAULT_REVIEW_FORM,
  deleteReviewDraft,
  FieldErrors,
  formsEqual,
  getDraftUpdatedLabel,
  getEmployeeAssignedGoals,
  getEmployeeById,
  getFinalReview,
  getGoals,
  getReviewDraft,
  getReviewMeta,
  getReviewSnapshot,
  getSubmissionProgress,
  hasSavedDraft,
  initializeGoals,
  isNarrativeComplete,
  isRatingsComplete,
  migrateLegacyReviewStorage,
  saveReviewDraft,
  submitFinalReview,
  unassignEmployeeFromGoal,
  validateReviewForm,
  type ReviewFormData,
  type ReviewStatus,
} from "@/lib/performance-store";

const COMPETENCIES = [
  {
    key: "technical" as const,
    title: "Technical Proficiency",
    description:
      "Ability to apply industry-standard design tools and accessibility frameworks.",
  },
  {
    key: "delivery" as const,
    title: "Project Delivery",
    description:
      "Consistency in meeting project milestones and adherence to design timelines.",
  },
  {
    key: "strategic" as const,
    title: "Strategic Thinking",
    description:
      "Contribution to high-level product strategy and long-term vision alignment.",
  },
];

const STATUS_STYLES: Record<ReviewStatus | "Unsaved Changes", string> = {
  "Not Started": "bg-slate-100 text-slate-600 border-slate-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-100",
  "Draft Saved": "bg-amber-50 text-amber-700 border-amber-100",
  Submitted: "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Unsaved Changes": "bg-rose-50 text-rose-700 border-rose-100",
};

export default function PerformanceReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center text-sm text-slate-500">
          Loading review...
        </div>
      }
    >
      <PerformanceReviewContent />
    </Suspense>
  );
}

function PerformanceReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee");
  const mode = searchParams.get("mode");
  const isViewDraft = mode === "view";
  const isViewFinal = mode === "final";
  const isReadOnly = isViewDraft || isViewFinal;
  const profile = employeeId ? getEmployeeById(employeeId) : null;

  const [savedSnapshot, setSavedSnapshot] =
    useState<ReviewFormData>(DEFAULT_REVIEW_FORM);
  const [ratings, setRatings] = useState(DEFAULT_REVIEW_FORM.ratings);
  const [summary, setSummary] = useState("");
  const [achievements, setAchievements] = useState("");
  const [improvements, setImprovements] = useState("");
  const [futureGoal, setFutureGoal] = useState("");
  const [departmentGoals, setDepartmentGoals] = useState(getGoals());
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("Not Started");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const assignedGoals = employeeId ? getEmployeeAssignedGoals(employeeId) : [];

  const refreshGoals = useCallback(() => {
    initializeGoals();
    setDepartmentGoals(getGoals());
  }, []);

  const getCurrentForm = useCallback(
    (): ReviewFormData => ({
      ratings: { ...ratings },
      summary,
      achievements,
      improvements,
      futureGoal,
    }),
    [ratings, summary, achievements, improvements, futureGoal],
  );

  const applyFormData = useCallback((data: ReviewFormData) => {
    setRatings({ ...data.ratings });
    setSummary(data.summary);
    setAchievements(data.achievements);
    setImprovements(data.improvements);
    setFutureGoal(data.futureGoal);
    setSavedSnapshot({
      ...data,
      ratings: { ...data.ratings },
    });
  }, []);

  useEffect(() => {
    migrateLegacyReviewStorage();
    initializeGoals();

    // 1. Move the profile validation inside the effect to avoid object-reference dependency loops
    const currentProfile = employeeId ? getEmployeeById(employeeId) : null;

    if (!employeeId || !currentProfile) {
      setIsLoaded(true);
      return;
    }

    let snapshot: ReviewFormData;
    if (isViewFinal) {
      snapshot = getFinalReview(employeeId) ?? {
        ...DEFAULT_REVIEW_FORM,
        ratings: { ...DEFAULT_REVIEW_FORM.ratings },
      };
    } else if (isViewDraft) {
      snapshot = getReviewDraft(employeeId) ?? {
        ...DEFAULT_REVIEW_FORM,
        ratings: { ...DEFAULT_REVIEW_FORM.ratings },
      };
    } else {
      snapshot = getReviewSnapshot(employeeId);
    }

    applyFormData(snapshot);
    setReviewStatus(getReviewMeta(employeeId).status);
    refreshGoals();
    setIsLoaded(true);
  }, [employeeId, applyFormData, refreshGoals, isViewDraft, isViewFinal]); // 2. 'profile' removed from dependencies

  useEffect(() => {
    // 3. Move lookup inside the redirect effect as well
    const currentProfile = employeeId ? getEmployeeById(employeeId) : null;

    if (isLoaded && (!employeeId || !currentProfile)) {
      router.replace("/performance/reviews");
    }
  }, [isLoaded, employeeId, router]); // 4. 'profile' removed from dependencies
  const checkIsFormDirty = useCallback(() => {
    return !formsEqual(getCurrentForm(), savedSnapshot);
  }, [getCurrentForm, savedSnapshot]);

  const clearFieldError = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSaveDraft = useCallback(() => {
    if (!employeeId) return false;

    const payload = getCurrentForm();
    const { isValid, errors } = validateReviewForm(payload);

    if (!isValid) {
      setFieldErrors(errors);
      window.alert(
        "Complete all required review fields before saving a draft.",
      );
      return false;
    }

    saveReviewDraft(employeeId, payload);
    applyFormData(payload);
    setReviewStatus("Draft Saved");
    setFieldErrors({});
    window.alert("Draft saved successfully.");
    return true;
  }, [employeeId, getCurrentForm, applyFormData]);

  const handleSubmitFinalReview = useCallback(() => {
    if (!employeeId || !profile) return;

    const payload = isReadOnly
      ? (getReviewDraft(employeeId) ?? getFinalReview(employeeId))
      : getCurrentForm();

    if (!payload) {
      window.alert("No saved review data to submit.");
      return;
    }

    const { isValid, errors } = validateReviewForm(payload);

    if (!isValid) {
      setFieldErrors(errors);
      window.alert("Complete all required review fields before submitting.");
      return;
    }

    submitFinalReview(employeeId, payload);
    applyFormData(payload);
    setReviewStatus("Submitted");
    setFieldErrors({});
    window.alert(`Final review submitted for ${profile.name}.`);
    router.replace(`/performance/review?employee=${employeeId}&mode=final`);
  }, [employeeId, profile, getCurrentForm, applyFormData, isReadOnly, router]);

  const handleEditDraft = useCallback(() => {
    if (!employeeId) return;
    router.push(`/performance/review?employee=${employeeId}`);
  }, [employeeId, router]);

  const handleViewDraft = useCallback(() => {
    if (!employeeId) return;
    router.push(`/performance/review?employee=${employeeId}&mode=view`);
  }, [employeeId, router]);

  const resetFormToSaved = useCallback(() => {
    applyFormData(savedSnapshot);
    setFieldErrors({});
  }, [applyFormData, savedSnapshot]);

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
      "Discard unsaved changes and revert to the last saved draft?",
    );
    if (!confirmed) return;
    resetFormToSaved();
  };

  const handleDeleteSavedDraft = () => {
    if (!employeeId || !profile) return;
    const confirmed = window.confirm(
      `Delete all saved review data for ${profile.name}? This cannot be undone.`,
    );
    if (!confirmed) return;

    deleteReviewDraft(employeeId);
    applyFormData({
      ...DEFAULT_REVIEW_FORM,
      ratings: { ...DEFAULT_REVIEW_FORM.ratings },
    });
    setReviewStatus("Not Started");
    setFieldErrors({});
    window.alert("Saved review data deleted.");
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

  const handleSetRating = (
    competencyKey: "technical" | "delivery" | "strategic",
    score: number,
  ) => {
    setRatings((prev) => ({ ...prev, [competencyKey]: score }));
    clearFieldError("ratings");
  };

  const handleToggleGoalAssignment = (goalId: string, isAssigned: boolean) => {
    if (!employeeId) return;
    if (isAssigned) {
      unassignEmployeeFromGoal(goalId, employeeId);
    } else {
      assignEmployeeToGoal(goalId, employeeId);
    }
    refreshGoals();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center text-sm text-slate-500">
        Loading review...
      </div>
    );
  }

  if (!employeeId || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 flex items-center justify-center text-sm text-slate-500">
        Redirecting to review targets...
      </div>
    );
  }

  const currentForm = getCurrentForm();
  const isDirty = !isReadOnly && checkIsFormDirty();
  const completionPercent = getSubmissionProgress(currentForm);
  const ratingsComplete = isRatingsComplete(currentForm);
  const narrativeComplete = isNarrativeComplete(currentForm);
  const draftUpdatedLabel = employeeId
    ? getDraftUpdatedLabel(employeeId)
    : null;
  const savedDraftExists = employeeId ? hasSavedDraft(employeeId) : false;
  const viewDraftEmpty = isViewDraft && !savedDraftExists;
  const viewFinalEmpty = isViewFinal && reviewStatus !== "Submitted";
  const displayStatus: ReviewStatus | "Unsaved Changes" = isDirty
    ? "Unsaved Changes"
    : isViewDraft
      ? "Draft Saved"
      : reviewStatus;
  const pageTitle = isViewDraft
    ? `Saved Draft — ${profile.name}`
    : isViewFinal
      ? `Submitted Review — ${profile.name}`
      : `Annual Performance Review — ${profile.name}`;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-900">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => attemptNavigation("/performance")}
          className="hover:text-slate-600 transition-colors cursor-pointer"
        >
          Performance
        </button>
        <span className="text-slate-300 font-normal">&gt;</span>
        <button
          type="button"
          onClick={() => attemptNavigation("/performance/reviews")}
          className="hover:text-slate-600 transition-colors cursor-pointer"
        >
          Review Targets
        </button>
        <span className="text-slate-300 font-normal">&gt;</span>
        <span className="text-slate-500">{profile.name}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {pageTitle}
          </h1>
          <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
            {isViewDraft
              ? `Read-only preview of the saved draft for ${profile.name}. Edit or submit when you are ready.`
              : isViewFinal
                ? `Final submitted review for ${profile.name}. This record is read-only.`
                : `Complete the FY24 review for ${profile.name}. Drafts and final submissions are stored separately per employee.`}
          </p>
          {!isReadOnly && isDirty && (
            <p className="text-xs font-semibold text-amber-600">
              Unsaved changes — save your draft before leaving this page.
            </p>
          )}
          {!isReadOnly &&
            savedDraftExists &&
            !isDirty &&
            reviewStatus === "Draft Saved" && (
              <p className="text-xs font-semibold text-blue-600">
                Saved draft restored
                {draftUpdatedLabel
                  ? ` (last updated ${draftUpdatedLabel})`
                  : ""}
                .
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
                onClick={handleSubmitFinalReview}
                disabled={viewDraftEmpty}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-950 rounded-lg hover:bg-slate-900 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Final Review
              </button>
            </>
          )}
          {isViewFinal && (
            <button
              type="button"
              onClick={() => attemptNavigation("/performance/reviews")}
              className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              Back to Review Targets
            </button>
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
                onClick={handleSaveDraft}
                className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleSubmitFinalReview}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-950 rounded-lg hover:bg-slate-900 active:scale-95 transition-all cursor-pointer"
              >
                Submit Final Review
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
                : "This is a read-only preview of your saved work."}{" "}
              Use Edit Draft to make changes, or Submit Final Review when ready.
            </p>
          </div>
        </div>
      )}

      {viewDraftEmpty && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <p>
            No saved draft found for {profile.name}.{" "}
            <button
              type="button"
              onClick={handleEditDraft}
              className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Start or continue the review
            </button>
          </p>
        </div>
      )}

      {isViewFinal && !viewFinalEmpty && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold">Submitted review</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              This review has been finalized and cannot be edited.
            </p>
          </div>
        </div>
      )}

      {viewFinalEmpty && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <p>
            No submitted review found for {profile.name}.{" "}
            <button
              type="button"
              onClick={handleEditDraft}
              className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Open the review form
            </button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col space-y-5">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 border-white shadow-xs ${profile.avatarBg}`}
              >
                {profile.initials}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-800 leading-tight">
                  {profile.name}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  {profile.role}
                </p>
                <span className="inline-block text-[9px] font-bold text-blue-600 tracking-wider">
                  {profile.department}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs font-semibold">
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400">Reviewer</span>
                <span className="text-slate-700">{profile.reviewer}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400">Due Date</span>
                <span className="text-rose-600 font-bold">
                  {profile.dueDate}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400">Status</span>
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${STATUS_STYLES[displayStatus]}`}
                >
                  {displayStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] text-white p-6 rounded-xl shadow-sm flex flex-col space-y-6">
            <div className="space-y-2">
              <h2 className="text-sm font-bold tracking-tight">
                Submission Progress
              </h2>
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>
                  {
                    Object.values(currentForm.ratings).filter(
                      (score) => score > 0,
                    ).length
                  }
                  /3 competencies rated
                </span>
                <span className="font-bold text-white">
                  {completionPercent}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-3" />
                </div>
                <span className="text-slate-300">Personal Information</span>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    ratingsComplete
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-slate-600 bg-slate-900"
                  }`}
                >
                  {ratingsComplete ? (
                    <Check className="w-3.5 h-3.5 stroke-3" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <span
                  className={
                    ratingsComplete ? "text-slate-300" : "text-white font-bold"
                  }
                >
                  Technical KPI Ratings
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    narrativeComplete
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-slate-600 bg-slate-900"
                  }`}
                >
                  {narrativeComplete ? (
                    <Check className="w-3.5 h-3.5 stroke-3" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <span
                  className={
                    narrativeComplete
                      ? "text-slate-300"
                      : "text-white font-bold"
                  }
                >
                  Self-Assessment Narrative
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Star className="w-5 h-5 fill-blue-600" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-800">
                KPI Rating & Competencies *
              </h2>
            </div>
            {fieldErrors.ratings && (
              <p className="text-[11px] font-semibold text-rose-600">
                {fieldErrors.ratings}
              </p>
            )}

            <div className="space-y-6">
              {COMPETENCIES.map((comp) => {
                const currentScore = ratings[comp.key];

                return (
                  <div
                    key={comp.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1 max-w-md">
                      <h3 className="text-sm font-bold text-slate-800">
                        {comp.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        {comp.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      {[1, 2, 3, 4, 5].map((starNum) => {
                        const isFilled = starNum <= currentScore;

                        return (
                          <button
                            key={starNum}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => handleSetRating(comp.key, starNum)}
                            className={`p-0.5 transition-all ${
                              isReadOnly
                                ? "cursor-default"
                                : "hover:scale-110 active:scale-90 cursor-pointer"
                            } ${
                              isFilled
                                ? "text-blue-600 hover:text-blue-700"
                                : "text-slate-200 hover:text-slate-400"
                            }`}
                            title={`Rate ${starNum} out of 5`}
                          >
                            <Star
                              className={`w-5 h-5 ${
                                isFilled
                                  ? "fill-blue-600 text-blue-600"
                                  : "text-slate-200"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-800">
                Self-Assessment & Achievements *
              </h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <label htmlFor="summary">
                    Executive Summary of Performance *
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold lowercase">
                    {summary.length} / 2000 characters
                  </span>
                </div>
                <textarea
                  id="summary"
                  maxLength={2000}
                  value={summary}
                  readOnly={isReadOnly}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    clearFieldError("summary");
                  }}
                  placeholder="Briefly summarize your impact over the last 12 months..."
                  rows={4}
                  className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/20 resize-none font-medium leading-relaxed ${
                    fieldErrors.summary ? "border-rose-300" : "border-slate-200"
                  } ${isReadOnly ? "cursor-default bg-slate-50 text-slate-700" : ""}`}
                />
                {fieldErrors.summary && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    {fieldErrors.summary}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="achievements"
                    className="text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    Key Achievements *
                  </label>
                  <textarea
                    id="achievements"
                    value={achievements}
                    readOnly={isReadOnly}
                    onChange={(e) => {
                      setAchievements(e.target.value);
                      clearFieldError("achievements");
                    }}
                    placeholder="List 3-5 measurable wins..."
                    rows={4}
                    className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/20 resize-none font-medium leading-relaxed ${
                      fieldErrors.achievements
                        ? "border-rose-300"
                        : "border-slate-200"
                    } ${isReadOnly ? "cursor-default bg-slate-50 text-slate-700" : ""}`}
                  />
                  {fieldErrors.achievements && (
                    <p className="text-[11px] font-semibold text-rose-600">
                      {fieldErrors.achievements}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="improvements"
                    className="text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    Areas for Improvement *
                  </label>
                  <textarea
                    id="improvements"
                    value={improvements}
                    readOnly={isReadOnly}
                    onChange={(e) => {
                      setImprovements(e.target.value);
                      clearFieldError("improvements");
                    }}
                    placeholder="Identify professional growth areas..."
                    rows={4}
                    className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/20 resize-none font-medium leading-relaxed ${
                      fieldErrors.improvements
                        ? "border-rose-300"
                        : "border-slate-200"
                    } ${isReadOnly ? "cursor-default bg-slate-50 text-slate-700" : ""}`}
                  />
                  {fieldErrors.improvements && (
                    <p className="text-[11px] font-semibold text-rose-600">
                      {fieldErrors.improvements}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Flag className="w-5 h-5 fill-blue-600 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-800">
                Future Development Goals
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Assign or remove active department goals for {profile.name}.
                Progress stays synced across the performance dashboard and goals
                directory.
              </p>

              <div className="space-y-3">
                {(isReadOnly
                  ? departmentGoals.filter((goal) =>
                      goal.assignedEmployeeIds.includes(employeeId),
                    )
                  : departmentGoals
                ).map((goal) => {
                  const isAssigned =
                    goal.assignedEmployeeIds.includes(employeeId);

                  return (
                    <div
                      key={goal.id}
                      className="border border-slate-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-800">
                          {goal.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {goal.description}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {goal.progress}% complete · {goal.status}
                        </p>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleGoalAssignment(goal.id, isAssigned)
                          }
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition-colors cursor-pointer ${
                            isAssigned
                              ? "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {isAssigned ? "Assigned" : "Assign"}
                        </button>
                      )}
                      {isReadOnly && isAssigned && (
                        <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-blue-50 text-blue-700 border-blue-100">
                          Assigned
                        </span>
                      )}
                    </div>
                  );
                })}
                {isReadOnly &&
                  departmentGoals.every(
                    (goal) => !goal.assignedEmployeeIds.includes(employeeId),
                  ) && (
                    <p className="text-xs text-slate-500 font-medium">
                      No department goals assigned in this draft.
                    </p>
                  )}
              </div>

              {assignedGoals.length > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 font-semibold">
                  Currently assigned to {assignedGoals.length} active goal
                  {assignedGoals.length === 1 ? "" : "s"}.
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="futureGoal"
                  className="text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  Optional Future Goal
                </label>
                <textarea
                  id="futureGoal"
                  value={futureGoal}
                  readOnly={isReadOnly}
                  onChange={(e) => {
                    setFutureGoal(e.target.value);
                    clearFieldError("futureGoal");
                  }}
                  placeholder="Describe an optional objective for the next review cycle..."
                  rows={3}
                  className={`w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/20 resize-none font-medium leading-relaxed ${
                    isReadOnly
                      ? "cursor-default bg-slate-50 text-slate-700"
                      : ""
                  }`}
                />
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => attemptNavigation("/performance/goals")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Performance Goal
                </button>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-4 pb-12">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer active:scale-95"
                >
                  Discard Unsaved Changes
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSavedDraft}
                  className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors cursor-pointer active:scale-95"
                >
                  Delete Saved Draft
                </button>
              </div>

              <div className="flex items-center gap-3">
                {savedDraftExists && (
                  <button
                    type="button"
                    onClick={handleViewDraft}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Saved Draft
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFinalReview}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-slate-950 rounded-lg hover:bg-slate-900 active:scale-95 transition-all cursor-pointer"
                >
                  Submit Final Review
                </button>
              </div>
            </div>
          )}

          {isViewDraft && !viewDraftEmpty && (
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-4 pb-12">
              <button
                type="button"
                onClick={handleEditDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Draft
              </button>
              <button
                type="button"
                onClick={handleSubmitFinalReview}
                className="px-4 py-2.5 text-xs font-bold text-white bg-slate-950 rounded-lg hover:bg-slate-900 active:scale-95 transition-all cursor-pointer"
              >
                Submit Final Review
              </button>
            </div>
          )}
        </div>
      </div>

      {showUnsavedModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl border border-slate-100 shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Unsaved Changes
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              You have unsaved changes for {profile.name}&apos;s review. Save
              your draft before leaving, or discard the changes and continue.
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
                Save Draft & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
