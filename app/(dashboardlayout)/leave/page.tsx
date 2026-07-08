"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Calendar,
  ClipboardPlus,
  Users,
  Download,
  ChevronDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  AlertCircle, // Imported for the suspended account warning
} from "lucide-react";
import {
  deleteLeaveDraft,
  formatLeaveUpdatedAt,
  getLeaveDraftSummary,
  getLeaveRequests,
  initializeLeaveDraftStorage,
  LEAVE_REQUESTS_KEY,
  type SavedLeaveDraft,
  type LeaveRequest,
} from "@/lib/leave-store";

// 1. ADDED IMPORTS: To check real-time employee suspension statuses
import { getAllEmployees } from "@/lib/storage";
import { employees as seedEmployees, type Employee } from "@/lib/mock-data";

export default function LeaveManagementDashboard() {
  const [activeFilterTab, setActiveFilterTab] = useState("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("All Types");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // 2. STATES: Use the strictly typed hydrated requests from the store
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<SavedLeaveDraft[]>([]);

  const refreshDashboardData = () => {
    initializeLeaveDraftStorage();
    setDrafts(getLeaveDrafts());

    // 3. HYDRATION: Fetch fully populated relational data (Names, Avatars) instead of raw text strings
    const hydratedRequests = getLeaveRequests();
    setRequests(hydratedRequests);

    // Fetch live directory to check suspension statuses
    setActiveEmployees(getAllEmployees(seedEmployees));
  };

  // Helper for Drafts sorting (defined here since we removed getLeaveDrafts from imports if it was missing)
  const getLeaveDrafts = () => {
    const raw = localStorage.getItem("hr_connect_leave_drafts");
    const parsed: SavedLeaveDraft[] = raw ? JSON.parse(raw) : [];
    return parsed.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  };

  const handleDeleteDraft = (draft: SavedLeaveDraft) => {
    const confirmed = window.confirm(
      `Delete the saved draft for ${draft.data.employeeId ? "this employee" : "this application"}? This cannot be undone.`,
    );
    if (!confirmed) return;
    deleteLeaveDraft(draft.id);
    refreshDashboardData();
  };

  useEffect(() => {
    // 4. ON MOUNT: Load all relational data
    refreshDashboardData();

    const handleFocus = () => {
      refreshDashboardData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleUpdateStatus = (targetId: string, nextStatus: string) => {
    const updated = requests.map((req) => {
      if (req.id === targetId) {
        return { ...req, status: nextStatus };
      }
      return req;
    });

    setRequests(updated);

    // Write the raw update back to storage
    const rawStorage = localStorage.getItem(LEAVE_REQUESTS_KEY);
    if (rawStorage) {
      const parsedRaw = JSON.parse(rawStorage);
      const updatedRaw = parsedRaw.map((r: any) =>
        r.id === targetId ? { ...r, status: nextStatus } : r,
      );
      localStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(updatedRaw));
    }
  };

  const handleInitialActionConfirm = (
    targetId: string,
    employeeName: string,
    action: "Approved" | "Rejected",
  ) => {
    const confirmMessage = `Are you sure you want to ${
      action === "Approved" ? "APPROVE" : "REJECT"
    } ${employeeName}'s leave request?`;

    const hasConfirmed = window.confirm(confirmMessage);
    if (hasConfirmed) {
      handleUpdateStatus(targetId, action);
    }
  };

  const handleChangeStatusAnytimeConfirm = (
    targetId: string,
    employeeName: string,
    nextStatus: string,
  ) => {
    const activeRecord = requests.find((req) => req.id === targetId);

    if (activeRecord && activeRecord.status === nextStatus) {
      alert(`This request is already set to ${nextStatus.toUpperCase()}.`);
      return;
    }

    const confirmMessage = `WARNING: ${employeeName}'s request is already processed. \n\nAre you sure you want to modify their status to ${nextStatus.toUpperCase()}?`;

    const hasConfirmed = window.confirm(confirmMessage);
    if (hasConfirmed) {
      handleUpdateStatus(targetId, nextStatus);
      setActiveMenuId(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesTab =
      activeFilterTab === "ALL" || req.status.toUpperCase() === activeFilterTab;

    const matchesType =
      selectedTypeFilter === "All Types" ||
      req.leaveType === selectedTypeFilter;

    return matchesTab && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-900">
      {/* SECTION 1: HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Leave Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage employee absences and track leave balances across the
            organization.
          </p>
        </div>

        <Link
          href="/leave/apply"
          className="text-xs font-semibold text-white bg-[#0f172a] hover:bg-slate-800 px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </Link>
      </div>

      {drafts.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-amber-100 bg-amber-50/60">
            <div>
              <h2 className="text-sm font-bold text-amber-900">
                Saved Application Drafts
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                {drafts.length} draft{drafts.length === 1 ? "" : "s"} saved
                locally. Start a new application anytime without losing these.
              </p>
            </div>
            <Link
              href="/leave/apply"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Application
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {drafts.map((draft) => {
              const summary = getLeaveDraftSummary(draft);
              const updatedLabel = formatLeaveUpdatedAt(draft.updatedAt);

              return (
                <div
                  key={draft.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {summary.title}
                    </p>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {summary.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400">
                      {summary.datesLabel && <span>{summary.datesLabel}</span>}
                      {updatedLabel && (
                        <>
                          {summary.datesLabel && <span>·</span>}
                          <span>Saved {updatedLabel}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/leave/apply?draft=${draft.id}&mode=view`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Draft
                    </Link>
                    <Link
                      href={`/leave/apply?draft=${draft.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Continue
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(draft)}
                      className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: LEAVE METRICS GRID */}
      {/* SECTION 2: LEAVE METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 border-l-4 border-l-blue-500 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Annual Leave Balance
            </span>
            <div className="text-blue-500 bg-blue-50/50 p-1.5 rounded-md border border-blue-100/30">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-3xl font-bold flex items-baseline gap-1 leading-none">
              {/* Dynamic average or company pool could go here. Keeping standard pool for now. */}
              <span>18</span>
              <span className="text-xs font-semibold text-slate-500 lowercase">
                days
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Avg. remaining per employee</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 border-l-4 border-l-rose-500 shadow-sm flex flex-col justify-between h-36">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sick Leave Balance
            </span>
            <div className="text-rose-500 bg-rose-50/50 p-1.5 rounded-md border border-rose-100/30">
              <ClipboardPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-3xl font-bold flex items-baseline gap-1 leading-none">
              <span>05</span>
              <span className="text-xs font-semibold text-slate-500 lowercase">
                days
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Avg. remaining per employee</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 border-l-4 border-l-slate-900 shadow-sm flex flex-col justify-between h-36 sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Team Attendance Today
            </span>
            <div className="text-slate-700 bg-slate-100/50 p-1.5 rounded-md border border-slate-200/50">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="space-y-1.5">
              <div className="text-3xl font-bold flex items-baseline gap-1 leading-none">
                {(() => {
                  // DYNAMIC MATH: Calculate percentage based on total active employees vs approved leaves
                  const approvedLeaves = requests.filter(
                    (r) => r.status === "Approved",
                  );
                  const totalEmployees = activeEmployees.length;
                  const presentCount = Math.max(
                    0,
                    totalEmployees - approvedLeaves.length,
                  );
                  const percentage =
                    totalEmployees > 0
                      ? Math.round((presentCount / totalEmployees) * 100)
                      : 0;

                  return <span>{percentage}%</span>;
                })()}
                <span className="text-xs font-semibold text-slate-500">
                  Present
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">
                {requests.filter((r) => r.status === "Approved").length} members
                on leave
              </p>
            </div>

            {/* DYNAMIC AVATARS: Renders the avatars of the actual employees on leave */}
            <div className="flex -space-x-1.5">
              {(() => {
                const approvedLeaves = requests.filter(
                  (r) => r.status === "Approved",
                );
                if (approvedLeaves.length === 0) {
                  return (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      All Present
                    </span>
                  );
                }

                // Render up to 3 avatars
                return approvedLeaves.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    title={req.name}
                    className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold ${req.avatarBg}`}
                  >
                    {req.initials}
                  </div>
                ));
              })()}

              {/* If more than 3 people are on leave, show a +X badge */}
              {requests.filter((r) => r.status === "Approved").length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-xs">
                  +{requests.filter((r) => r.status === "Approved").length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: FILTER & EXPORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs relative">
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-lg self-start gap-0.5">
          {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveFilterTab(tab);
                  setActiveMenuId(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  activeFilterTab === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "ALL"
                  ? "All Requests"
                  : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ),
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="relative">
            <button
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>
                {selectedTypeFilter === "All Types"
                  ? "Leave Type"
                  : selectedTypeFilter}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-lg shadow-md z-30 py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-200">
                {[
                  "All Types",
                  "Annual Leave",
                  "Sick Leave",
                  "Maternity Leave",
                  "Personal Leave",
                ].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedTypeFilter(type);
                      setIsTypeDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: LEAVE REQUESTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-6">Leave Type</th>
                <th className="py-3.5 px-6">Dates</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((row) => {
                  let badgeClass = "bg-slate-100 text-slate-600";
                  if (row.status === "Approved")
                    badgeClass = "bg-emerald-100 text-emerald-700";
                  else if (row.status === "Pending")
                    badgeClass = "bg-blue-100 text-blue-700";
                  else if (row.status === "Rejected")
                    badgeClass = "bg-rose-100 text-rose-700";
                  else if (row.status === "Cancelled")
                    badgeClass = "bg-slate-100 text-slate-600";

                  const isPending = row.status === "Pending";

                  // 5. SUSPENSION SAFEGUARD: Check if the employee profile is Suspended
                  const employeeProfile = activeEmployees.find(
                    (e) => e.id === row.employeeId || e.name === row.name,
                  );
                  const isSuspended = employeeProfile?.status === "Suspended";

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors align-middle ${isSuspended ? "bg-slate-50/50 opacity-60 grayscale-[50%]" : "hover:bg-slate-50/30"}`}
                    >
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white flex-shrink-0 ${row.avatarBg}`}
                        >
                          {row.initials}
                        </div>
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                            {row.name}
                            {/* Warning icon if suspended */}
                            {isSuspended && (
                              <span
                                title="Account Suspended"
                                className="flex items-center"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {row.role}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-600 font-semibold text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${row.typeColor}`}
                          />
                          <span>{row.leaveType}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                        {row.dates}
                      </td>

                      <td className="py-4 px-6 text-slate-500 font-bold text-xs">
                        {row.duration}
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${badgeClass}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        {isSuspended ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Locked
                          </span>
                        ) : isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                handleInitialActionConfirm(
                                  row.id,
                                  row.name,
                                  "Approved",
                                )
                              }
                              className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer transition-colors active:scale-95"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleInitialActionConfirm(
                                  row.id,
                                  row.name,
                                  "Rejected",
                                )
                              }
                              className="px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-md cursor-pointer transition-all active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() =>
                                setActiveMenuId(
                                  activeMenuId === row.id ? null : row.id,
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Modify status"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuId === row.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs font-semibold text-slate-600 text-left animate-in fade-in zoom-in-95 duration-100">
                                {row.status !== "Approved" && (
                                  <button
                                    onClick={() =>
                                      handleChangeStatusAnytimeConfirm(
                                        row.id,
                                        row.name,
                                        "Approved",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {row.status !== "Rejected" && (
                                  <button
                                    onClick={() =>
                                      handleChangeStatusAnytimeConfirm(
                                        row.id,
                                        row.name,
                                        "Rejected",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-rose-600"
                                  >
                                    Reject
                                  </button>
                                )}
                                {row.status !== "Cancelled" && (
                                  <button
                                    onClick={() =>
                                      handleChangeStatusAnytimeConfirm(
                                        row.id,
                                        row.name,
                                        "Cancelled",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                                {row.status !== "Pending" && (
                                  <button
                                    onClick={() =>
                                      handleChangeStatusAnytimeConfirm(
                                        row.id,
                                        row.name,
                                        "Pending",
                                      )
                                    }
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-blue-600 border-t border-slate-100 mt-1 pt-2"
                                  >
                                    Mark Pending
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center space-y-2">
                    <div className="text-slate-300 font-bold text-base">
                      No Requests Found
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      No leave applications match your active filtering
                      parameters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing 1-{filteredRequests.length} of {filteredRequests.length}{" "}
            requests
          </span>
          <div className="flex items-center gap-1.5">
            <button className="p-1 border border-slate-200 bg-white rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-1 border border-slate-200 bg-white rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
