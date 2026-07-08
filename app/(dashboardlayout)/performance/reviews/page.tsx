"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Pencil,
} from "lucide-react";
import {
  getEmployees,
  getReviewMeta,
  hasSavedDraft,
  migrateLegacyReviewStorage,
  type ReviewStatus,
} from "@/lib/performance-store";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  "Not Started": "Not Started",
  "In Progress": "In Progress",
  "Draft Saved": "Draft Saved",
  Submitted: "Submitted",
};

const STATUS_CLASSES: Record<ReviewStatus, string> = {
  "Not Started": "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-100 text-blue-700",
  "Draft Saved": "bg-amber-100 text-amber-700",
  Submitted: "bg-emerald-100 text-emerald-700",
};

export default function PerformanceReviewsListPage() {
  const [statusMap, setStatusMap] = useState<Record<string, ReviewStatus>>({});

  useEffect(() => {
    migrateLegacyReviewStorage();
    const employees = getEmployees();
    const map = Object.fromEntries(
      employees.map((employee) => [
        employee.id,
        getReviewMeta(employee.id).status,
      ]),
    ) as Record<string, ReviewStatus>;
    setStatusMap(map);

    const handleFocus = () => {
      const refreshed = Object.fromEntries(
        getEmployees().map((employee) => [
          employee.id,
          getReviewMeta(employee.id).status,
        ]),
      ) as Record<string, ReviewStatus>;
      setStatusMap(refreshed);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const employees = getEmployees();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-900">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Link
          href="/performance"
          className="hover:text-slate-600 transition-colors cursor-pointer"
        >
          Performance
        </Link>
        <span className="text-slate-300 font-normal">&gt;</span>
        <span className="text-slate-500">Review Targets</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Annual Review 2024 — Employee Targets
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Select an employee to open or continue their performance review.
            Saved drafts can be viewed read-only before you submit the final
            review.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs font-semibold text-blue-700">
          <ClipboardList className="w-4 h-4" />
          <span>{employees.length} reviews in this cycle</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => {
          const status = statusMap[employee.id] ?? "Not Started";
          const draftSaved = hasSavedDraft(employee.id);
          const reviewHref = `/performance/review?employee=${employee.id}`;
          const viewDraftHref = `/performance/review?employee=${employee.id}&mode=view`;
          const viewFinalHref = `/performance/review?employee=${employee.id}&mode=final`;

          return (
            <div
              key={employee.id}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-xs ${employee.avatarBg}`}
                >
                  {employee.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 truncate">
                    {employee.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium truncate">
                    {employee.role}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {employee.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Due {employee.dueDate}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_CLASSES[status]}`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {draftSaved && (
                  <Link
                    href={viewDraftHref}
                    className="inline-flex items-center gap-1.5 flex-1 justify-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Draft
                  </Link>
                )}
                {status === "Submitted" && (
                  <Link
                    href={viewFinalHref}
                    className="inline-flex items-center gap-1.5 flex-1 justify-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Submission
                  </Link>
                )}
                <Link
                  href={reviewHref}
                  className="inline-flex items-center gap-1.5 flex-1 justify-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {status === "Not Started" ? (
                    <>
                      <ChevronRight className="w-3.5 h-3.5" />
                      Start Review
                    </>
                  ) : status === "Submitted" ? (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      Open Review
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      Continue Editing
                    </>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
