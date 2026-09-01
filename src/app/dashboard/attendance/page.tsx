"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  CalendarCheck, Users, CheckCircle2, XCircle, Clock, 
  HelpCircle, Save, Send, MessageSquare, Loader2, ArrowLeft,
  Calendar, Check, AlertCircle, RefreshCw, Search, Filter,
  CheckCheck, UserX, ShieldAlert, Copy
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";
import { CustomSelect } from "@/components/ui/Select";

interface StudentAttendance {
  student_id: string;
  student_name: string;
  roll_number?: string;
  parent_name?: string;
  parent_contact?: string;
  contact_number?: string;
  status: "present" | "absent" | "late" | "excused";
  remarks: string;
  attendance_id?: string;
}

export default function AttendancePage() {
  const { settings } = useSettings();
  
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent" | "late" | "excused">("all");
  
  const [tableMissing, setTableMissing] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  
  const [messageTemplate, setMessageTemplate] = useState<string>(
    "Dear Parent, this is to inform you that {StudentName} was marked ABSENT for today's ({Date}) class in {BatchName} at {InstituteName}. Please contact us if you have any questions."
  );

  // 1. Fetch batches
  useEffect(() => {
    const fetchBatches = async () => {
      if (!settings?.academic_year) return;
      try {
        setLoadingBatches(true);
        const { data, error } = await supabase
          .from("batches")
          .select("id, name, status")
          .eq("academic_year", settings.academic_year)
          .eq("status", "active")
          .order("name", { ascending: true });

        if (error) throw error;
        setBatches(data || []);
        if (data && data.length > 0) {
          setSelectedBatchId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching batches:", err);
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchBatches();
  }, [settings?.academic_year]);

  // 2. Fetch students & attendance for selected batch and date
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedBatchId || !settings?.academic_year) {
        setAttendanceList([]);
        return;
      }

      try {
        setLoadingAttendance(true);
        setSaveSuccess(false);
        setHasUnsavedChanges(false);

        // 1. Fetch student IDs enrolled in this batch
        const { data: enrollments, error: enrollError } = await supabase
          .from("enrollments")
          .select("student_id")
          .eq("batch_id", selectedBatchId);

        if (enrollError) {
          console.error("Error fetching enrollments:", enrollError);
          throw enrollError;
        }

        const studentIds = (enrollments || []).map(e => e.student_id).filter(Boolean);

        // 2. Fetch student details directly
        let studentsData: any[] = [];
        if (studentIds.length > 0) {
          const { data: stds, error: stdError } = await supabase
            .from("students")
            .select("*")
            .in("id", studentIds);

          if (stdError) {
            console.error("Error fetching students:", stdError);
            throw stdError;
          }
          studentsData = stds || [];
        }

        // 3. Fetch existing attendance records for this date and batch (graceful fallback)
        let attendanceMap = new Map<string, any>();
        try {
          const { data: existingAttendance, error: attError } = await supabase
            .from("attendance")
            .select("*")
            .eq("batch_id", selectedBatchId)
            .eq("date", selectedDate);

          if (attError) {
            console.warn("Attendance query notice:", attError);
            if (attError.code === "42P01" || attError.message?.includes("does not exist") || attError.message?.includes("schema cache")) {
              setTableMissing(true);
            } else {
              setTableMissing(false);
            }
          } else {
            setTableMissing(false);
            (existingAttendance || []).forEach(att => {
              attendanceMap.set(att.student_id, att);
            });
          }
        } catch (e: any) {
          console.warn("Attendance catch:", e);
        }

        // 4. Map into attendance list
        const formattedList: StudentAttendance[] = studentsData
          .filter(student => student.enrollment_status !== "inactive")
          .map(student => {
            const existing = attendanceMap.get(student.id);
            return {
              student_id: student.id,
              student_name: student.full_name || "Unknown Student",
              roll_number: student.roll_number || "",
              parent_name: student.parent_name || "",
              parent_contact: student.parent_contact || student.contact_number || "",
              contact_number: student.contact_number || "",
              status: existing ? existing.status : "present", // Default to present for fast entry
              remarks: existing ? (existing.remarks || "") : "",
              attendance_id: existing ? existing.id : undefined
            };
          });

        setAttendanceList(formattedList);
      } catch (err: any) {
        console.error("Error loading attendance list:", err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendanceData();
  }, [selectedBatchId, selectedDate, settings?.academic_year]);

  // Handle single status change
  const handleStatusChange = (studentId: string, status: "present" | "absent" | "late" | "excused") => {
    setAttendanceList(prev =>
      prev.map(item =>
        item.student_id === studentId ? { ...item, status } : item
      )
    );
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  // Handle remarks change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceList(prev =>
      prev.map(item =>
        item.student_id === studentId ? { ...item, remarks } : item
      )
    );
    setHasUnsavedChanges(true);
  };

  // Mark all students as present
  const handleMarkAll = (status: "present" | "absent" | "late" | "excused") => {
    setAttendanceList(prev =>
      prev.map(item => ({ ...item, status }))
    );
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
  };

  // Save attendance to database
  const handleSaveAttendance = async () => {
    if (attendanceList.length === 0) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;

      const payload = attendanceList.map(item => ({
        student_id: item.student_id,
        batch_id: selectedBatchId,
        date: selectedDate,
        status: item.status,
        remarks: item.remarks ? item.remarks.trim() : null,
        academic_year: settings?.academic_year || "2025-26",
        marked_by: currentUserId,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(payload, { onConflict: "student_id,batch_id,date" });

      if (error) throw error;

      setTableMissing(false);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error saving attendance:", err);
      if (err.message?.includes("Could not find the table 'public.attendance'") || err.code === "42P01" || err.message?.includes("does not exist") || err.message?.includes("schema cache")) {
        setTableMissing(true);
      } else {
        alert("Failed to save attendance: " + (err.message || "Unknown error"));
      }
    } finally {
      setSaving(false);
    }
  };

  // Statistics calculation
  const totalStudents = attendanceList.length;
  const presentCount = attendanceList.filter(a => a.status === "present").length;
  const absentCount = attendanceList.filter(a => a.status === "absent").length;
  const lateCount = attendanceList.filter(a => a.status === "late").length;
  const excusedCount = attendanceList.filter(a => a.status === "excused").length;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  const currentBatchName = batches.find(b => b.id === selectedBatchId)?.name || "Batch";

  // Filtered students list for display
  const filteredList = useMemo(() => {
    return attendanceList.filter(item => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        item.student_name.toLowerCase().includes(query) ||
        (item.roll_number && item.roll_number.toLowerCase().includes(query)) ||
        (item.parent_contact && item.parent_contact.includes(query));

      // Status match
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendanceList, searchQuery, statusFilter]);

  // Format WhatsApp message for a student
  const getWhatsAppMessage = (student: StudentAttendance) => {
    const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    return messageTemplate
      .replace(/{StudentName}/g, student.student_name)
      .replace(/{Date}/g, formattedDate)
      .replace(/{BatchName}/g, currentBatchName)
      .replace(/{InstituteName}/g, settings?.name || "our Coaching Institute")
      .replace(/{Phone}/g, settings?.phone || "");
  };

  const getWhatsAppUrl = (student: StudentAttendance) => {
    let rawContact = student.parent_contact || student.contact_number || "";
    let cleanPhone = rawContact.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
    
    const message = encodeURIComponent(getWhatsAppMessage(student));
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  const absentees = attendanceList.filter(a => a.status === "absent");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
            Daily Attendance
          </h1>
          <p className="text-muted" style={{ marginTop: "0.25rem" }}>
            Mark student attendance, track attendance rates, and trigger instant WhatsApp absent alerts.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {absentCount > 0 && (
            <button
              onClick={() => setShowNotifyModal(true)}
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#25D366",
                borderColor: "#25D366",
                background: "rgba(37, 211, 102, 0.06)"
              }}
            >
              <MessageSquare size={16} />
              Notify Absentees ({absentCount})
            </button>
          )}

          <button
            onClick={handleSaveAttendance}
            disabled={saving || attendanceList.length === 0}
            className="btn btn-primary"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem",
              background: hasUnsavedChanges ? "var(--primary)" : undefined
            }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {saveSuccess ? "Saved Successfully!" : hasUnsavedChanges ? "Save Changes *" : "Save Attendance"}
          </button>
        </div>
      </div>

      {/* Unsaved changes banner (single save button remains in the top header) */}
      {hasUnsavedChanges && (
        <div style={{
          background: "rgba(79, 70, 229, 0.08)",
          border: "1px solid rgba(79, 70, 229, 0.25)",
          borderRadius: "var(--radius)",
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem"
        }}>
          <AlertCircle size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
          <span style={{ fontSize: "0.875rem", color: "var(--foreground)", fontWeight: 500 }}>
            You have unsaved attendance changes. Click the <strong>"Save Changes *"</strong> button in the top right to store them.
          </span>
        </div>
      )}

      {/* Database Setup Warning if table does not exist */}
      {tableMissing && (
        <div className="card" style={{ border: "1px solid var(--danger)", background: "rgba(225, 29, 72, 0.04)", padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--danger)" }}>
              <ShieldAlert size={20} /> Supabase Attendance Table Setup Required
            </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    const sqlScript = `-- 1. Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    academic_year TEXT NOT NULL,
    marked_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (student_id, batch_id, date)
);

-- 2. Add foreign keys safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_student_id_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'attendance_batch_id_fkey') THEN
            ALTER TABLE public.attendance 
            ADD CONSTRAINT attendance_batch_id_fkey 
            FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Explicitly DISABLE Row Level Security
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- 4. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON public.attendance(batch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);

-- 5. Refresh Supabase API Schema Cache immediately
NOTIFY pgrst, 'reload schema';`;

                    navigator.clipboard.writeText(sqlScript);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="btn btn-outline"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  {copiedSql ? <Check size={14} style={{ color: "var(--success)" }} /> : <Copy size={14} />}
                  {copiedSql ? "Copied to Clipboard!" : "Copy SQL Script"}
                </button>
                <button
                  onClick={() => setTableMissing(false)}
                  className="btn btn-outline"
                  style={{ padding: "0.35rem 0.55rem", fontSize: "0.8125rem", border: "none" }}
                  title="Dismiss warning"
                >
                  ✕
                </button>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", margin: "0 0 0.5rem 0", color: "var(--foreground)" }}>
              The <code>public.attendance</code> table hasn't been created in Supabase yet. Click <strong>"Copy SQL Script"</strong> above, paste it into your <strong>Supabase SQL Editor</strong>, and click <strong>Run</strong>.
            </p>
          </div>
        )}

      {/* Controls Bar: Batch, Date, Quick Bulk Actions */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="form-grid-2" style={{ gap: "1.25rem", alignItems: "center", marginBottom: "1rem" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600 }}>Select Batch</label>
            <CustomSelect
              icon={<Users size={16} />}
              options={batches.map(b => ({ value: b.id, label: b.name }))}
              value={selectedBatchId}
              onChange={val => setSelectedBatchId(val)}
              placeholder={loadingBatches ? "Loading batches..." : "Select a batch"}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600 }}>Attendance Date</label>
            <div className="input-wrapper">
              <div className="input-icon"><Calendar size={16} /></div>
              <input
                type="date"
                className="input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Quick Mark:</span>
            <button
              type="button"
              onClick={() => handleMarkAll("present")}
              disabled={attendanceList.length === 0}
              className="btn btn-outline"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", color: "var(--success)", borderColor: "rgba(5, 150, 105, 0.3)" }}
            >
              <CheckCheck size={14} /> All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll("absent")}
              disabled={attendanceList.length === 0}
              className="btn btn-outline"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", color: "var(--danger)", borderColor: "rgba(225, 29, 72, 0.3)" }}
            >
              <UserX size={14} /> All Absent
            </button>
          </div>

          {/* Search bar inside controls */}
          <div className="input-wrapper" style={{ maxWidth: "260px", minWidth: "180px" }}>
            <div className="input-icon"><Search size={14} /></div>
            <input
              type="text"
              className="input"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: "0.35rem 0.75rem 0.35rem 2.25rem", fontSize: "0.8125rem" }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Bar & Distribution Visualizer */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div className="text-muted" style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase" }}>Enrolled</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)" }}>{totalStudents}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--success)" }}>Present</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)" }}>{presentCount}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--danger)" }}>Absent</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>{absentCount}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--warning)" }}>Late / Excused</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warning)" }}>{lateCount + excusedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--primary)" }}>Attendance %</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>{attendanceRate}%</div>
          </div>
        </div>

        {/* Stacked Visual Distribution Bar */}
        {totalStudents > 0 && (
          <div>
            <div style={{ display: "flex", height: "8px", borderRadius: "999px", overflow: "hidden", background: "var(--border)", gap: "2px" }}>
              <div style={{ width: `${(presentCount / totalStudents) * 100}%`, background: "var(--success)", transition: "width 0.3s" }} title={`Present: ${presentCount}`} />
              <div style={{ width: `${(lateCount / totalStudents) * 100}%`, background: "var(--warning)", transition: "width 0.3s" }} title={`Late: ${lateCount}`} />
              <div style={{ width: `${(excusedCount / totalStudents) * 100}%`, background: "#0284c7", transition: "width 0.3s" }} title={`Excused: ${excusedCount}`} />
              <div style={{ width: `${(absentCount / totalStudents) * 100}%`, background: "var(--danger)", transition: "width 0.3s" }} title={`Absent: ${absentCount}`} />
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
        <button
          onClick={() => setStatusFilter("all")}
          className={`btn ${statusFilter === "all" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.35rem 0.85rem", fontSize: "0.8125rem", borderRadius: "999px" }}
        >
          All ({totalStudents})
        </button>
        <button
          onClick={() => setStatusFilter("present")}
          className={`btn ${statusFilter === "present" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.35rem 0.85rem", fontSize: "0.8125rem", borderRadius: "999px", color: statusFilter === "present" ? undefined : "var(--success)" }}
        >
          Present ({presentCount})
        </button>
        <button
          onClick={() => setStatusFilter("absent")}
          className={`btn ${statusFilter === "absent" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.35rem 0.85rem", fontSize: "0.8125rem", borderRadius: "999px", color: statusFilter === "absent" ? undefined : "var(--danger)" }}
        >
          Absent ({absentCount})
        </button>
        <button
          onClick={() => setStatusFilter("late")}
          className={`btn ${statusFilter === "late" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.35rem 0.85rem", fontSize: "0.8125rem", borderRadius: "999px", color: statusFilter === "late" ? undefined : "var(--warning)" }}
        >
          Late ({lateCount})
        </button>
        <button
          onClick={() => setStatusFilter("excused")}
          className={`btn ${statusFilter === "excused" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.35rem 0.85rem", fontSize: "0.8125rem", borderRadius: "999px", color: statusFilter === "excused" ? undefined : "#0284c7" }}
        >
          Excused ({excusedCount})
        </button>
      </div>

      {/* Student Attendance List */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CalendarCheck size={18} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
              {currentBatchName} &middot; {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </h2>
          </div>
          <span className="text-muted" style={{ fontSize: "0.8125rem" }}>
            Showing {filteredList.length} of {totalStudents}
          </span>
        </div>

        {loadingAttendance ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <Loader2 className="animate-spin text-muted" size={28} style={{ margin: "0 auto 0.5rem" }} />
            <div className="text-muted" style={{ fontSize: "0.875rem" }}>Loading students...</div>
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
            <p>{attendanceList.length === 0 ? "No active students enrolled in this batch." : "No students match the current filter/search."}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredList.map((student, index) => {
              const isPresent = student.status === "present";
              const isAbsent = student.status === "absent";
              const isLate = student.status === "late";
              const isExcused = student.status === "excused";

              return (
                <div
                  key={student.student_id}
                  style={{
                    padding: "1rem 1.5rem",
                    borderBottom: index < filteredList.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    background: isAbsent 
                      ? "rgba(225, 29, 72, 0.04)" 
                      : isLate 
                      ? "rgba(245, 158, 11, 0.03)" 
                      : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  {/* Student Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: "220px", flex: 1 }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      background: isPresent 
                        ? "var(--success)" 
                        : isAbsent 
                        ? "var(--danger)" 
                        : isLate 
                        ? "var(--warning)" 
                        : "#0284c7",
                      color: "white", display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 700, fontSize: "0.9375rem",
                      flexShrink: 0,
                      transition: "background 0.2s"
                    }}>
                      {student.student_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: "0.9375rem" }}>
                        {student.student_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "0.5rem" }}>
                        {student.roll_number && <span>Roll: {student.roll_number}</span>}
                        {student.parent_contact && <span>&middot; Parent: {student.parent_contact}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Remarks Input */}
                  <div style={{ minWidth: "160px", flex: 1 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Remarks (e.g. sick leave, late 15m)..."
                      value={student.remarks}
                      onChange={e => handleRemarksChange(student.student_id, e.target.value)}
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8125rem" }}
                    />
                  </div>

                  {/* Modern Segmented Status Selector */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--surface-solid)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "3px",
                    gap: "2px"
                  }}>
                    {/* Present Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "present")}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "7px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        border: "none",
                        background: isPresent ? "var(--success)" : "transparent",
                        color: isPresent ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <CheckCircle2 size={13} /> Present
                    </button>

                    {/* Absent Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "absent")}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "7px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        border: "none",
                        background: isAbsent ? "var(--danger)" : "transparent",
                        color: isAbsent ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <XCircle size={13} /> Absent
                    </button>

                    {/* Late Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "late")}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "7px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        border: "none",
                        background: isLate ? "var(--warning)" : "transparent",
                        color: isLate ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <Clock size={13} /> Late
                    </button>

                    {/* Excused Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "excused")}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "7px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        border: "none",
                        background: isExcused ? "#0284c7" : "transparent",
                        color: isExcused ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <HelpCircle size={13} /> Leave
                    </button>
                  </div>

                  {/* Instant WhatsApp Button for Absentees */}
                  {isAbsent && (
                    <a
                      href={getWhatsAppUrl(student)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      title="Send WhatsApp Absent Alert"
                      style={{
                        padding: "0.35rem 0.65rem",
                        borderRadius: "8px",
                        color: "#25D366",
                        borderColor: "#25D366",
                        background: "rgba(37, 211, 102, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textDecoration: "none"
                      }}
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Notify Absentees Modal */}
      {showNotifyModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem"
        }}>
          <div className="card animate-in" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: "1.5rem", background: "var(--surface-solid)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageSquare size={20} style={{ color: "#25D366" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Notify Absentees on WhatsApp</h3>
              </div>
              <button
                onClick={() => setShowNotifyModal(false)}
                className="btn btn-outline"
                style={{ padding: "0.35rem", borderRadius: "50%", border: "none" }}
              >
                ✕
              </button>
            </div>

            {/* Template editor */}
            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label>Message Template</label>
              <textarea
                className="input"
                rows={3}
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                style={{ resize: "vertical", fontSize: "0.875rem", padding: "0.75rem" }}
              />
              <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                Available tags: <code>{"{StudentName}"}</code>, <code>{"{Date}"}</code>, <code>{"{BatchName}"}</code>, <code>{"{InstituteName}"}</code>, <code>{"{Phone}"}</code>
              </div>
            </div>

            {/* Absentees List with 1-click send */}
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Absent Students ({absentees.length})
            </div>

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, maxHeight: "300px", paddingRight: "0.25rem" }}>
              {absentees.map(student => {
                const contact = student.parent_contact || student.contact_number;
                return (
                  <div
                    key={student.student_id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      background: "var(--background)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{student.student_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {contact ? `Contact: ${contact}` : <span style={{ color: "var(--danger)" }}>No contact number on file</span>}
                      </div>
                    </div>

                    <a
                      href={getWhatsAppUrl(student)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{
                        padding: "0.4rem 0.875rem",
                        fontSize: "0.8125rem",
                        background: "#25D366",
                        color: "white",
                        borderColor: "#25D366",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem"
                      }}
                    >
                      <Send size={14} /> Send WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowNotifyModal(false)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
