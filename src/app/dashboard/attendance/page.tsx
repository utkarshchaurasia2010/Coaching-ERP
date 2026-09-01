"use client";

import { useState, useEffect } from "react";
import { 
  CalendarCheck, Users, CheckCircle2, XCircle, Clock, 
  HelpCircle, Save, Send, MessageSquare, Loader2, ArrowLeft,
  Calendar, Check, AlertCircle, RefreshCw
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
  
  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  
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

        // Fetch enrollments in this batch
        const { data: enrollments, error: enrollError } = await supabase
          .from("enrollments")
          .select(`
            student_id,
            students (*)
          `)
          .eq("batch_id", selectedBatchId);

        if (enrollError) throw enrollError;

        // Fetch existing attendance records for this date and batch
        const { data: existingAttendance, error: attError } = await supabase
          .from("attendance")
          .select("*")
          .eq("batch_id", selectedBatchId)
          .eq("date", selectedDate)
          .eq("academic_year", settings.academic_year);

        if (attError) {
          if (attError.code === "42P01" || attError.message?.includes("relation \"attendance\" does not exist") || attError.message?.includes("does not exist")) {
            setTableMissing(true);
          } else {
            console.warn("Notice fetching attendance:", attError.message);
          }
        } else {
          setTableMissing(false);
        }

        const attendanceMap = new Map<string, any>();
        (existingAttendance || []).forEach(att => {
          attendanceMap.set(att.student_id, att);
        });

        const formattedList: StudentAttendance[] = (enrollments || [])
          .filter(e => e.students && (e.students as any).enrollment_status !== "inactive")
          .map(e => {
            const student: any = e.students;
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
    setSaveSuccess(false);
  };

  // Handle remarks change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceList(prev =>
      prev.map(item =>
        item.student_id === studentId ? { ...item, remarks } : item
      )
    );
  };

  // Mark all students as present
  const handleMarkAllPresent = () => {
    setAttendanceList(prev =>
      prev.map(item => ({ ...item, status: "present" }))
    );
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

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error saving attendance:", err);
      alert("Failed to save attendance: " + err.message);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
            Daily Attendance
          </h1>
          <p className="text-muted" style={{ marginTop: "0.25rem" }}>
            Track batch-wise daily attendance and notify parents of absentees via WhatsApp.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleMarkAllPresent}
            disabled={attendanceList.length === 0}
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Check size={16} /> Mark All Present
          </button>

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
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {saveSuccess ? "Saved Successfully!" : "Save Attendance"}
          </button>
        </div>
      </div>

      {/* Database Setup Warning if table does not exist */}
      {tableMissing && (
        <div className="alert alert-danger" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
            <AlertCircle size={18} /> Attendance Table Setup Required
          </div>
          <div style={{ fontSize: "0.875rem" }}>
            The <code>attendance</code> table is not found in your Supabase database. Please run the migration script <code>create_attendance_schema.sql</code> in your Supabase SQL Editor to enable attendance saving.
          </div>
        </div>
      )}

      {/* Filter Bar: Batch & Date Selectors */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="form-grid-2" style={{ gap: "1.25rem", alignItems: "center" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Select Batch</label>
            <CustomSelect
              icon={<Users size={16} />}
              options={batches.map(b => ({ value: b.id, label: b.name }))}
              value={selectedBatchId}
              onChange={val => setSelectedBatchId(val)}
              placeholder={loadingBatches ? "Loading batches..." : "Select a batch"}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Attendance Date</label>
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
      </div>

      {/* Stats KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--primary)", padding: "0.75rem", borderRadius: "12px" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Total Enrolled</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)" }}>{totalStudents}</div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(5, 150, 105, 0.1)", color: "var(--success)", padding: "0.75rem", borderRadius: "12px" }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Present</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)" }}>{presentCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(225, 29, 72, 0.1)", color: "var(--danger)", padding: "0.75rem", borderRadius: "12px" }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Absent</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)" }}>{absentCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(217, 119, 6, 0.1)", color: "var(--warning)", padding: "0.75rem", borderRadius: "12px" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Late / Excused</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warning)" }}>{lateCount + excusedCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(79, 70, 229, 0.08)", color: "var(--primary)", padding: "0.75rem", borderRadius: "12px" }}>
            <CalendarCheck size={22} />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>Attendance Rate</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>{attendanceRate}%</div>
          </div>
        </div>
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
            {totalStudents} student{totalStudents !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingAttendance ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <Loader2 className="animate-spin text-muted" size={28} style={{ margin: "0 auto 0.5rem" }} />
            <div className="text-muted" style={{ fontSize: "0.875rem" }}>Loading students & attendance...</div>
          </div>
        ) : attendanceList.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Users size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
            <p>No active students enrolled in this batch.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {attendanceList.map((student, index) => {
              const isAbsent = student.status === "absent";
              const isLate = student.status === "late";
              const isExcused = student.status === "excused";

              return (
                <div
                  key={student.student_id}
                  style={{
                    padding: "1rem 1.5rem",
                    borderBottom: index < attendanceList.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    background: isAbsent ? "rgba(225, 29, 72, 0.02)" : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  {/* Student Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: "220px", flex: 1 }}>
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "50%",
                      background: isAbsent ? "var(--danger)" : "var(--primary)",
                      color: "white", display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 700, fontSize: "0.875rem",
                      flexShrink: 0
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
                  <div style={{ minWidth: "150px", flex: 1 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Add remarks (optional)..."
                      value={student.remarks}
                      onChange={e => handleRemarksChange(student.student_id, e.target.value)}
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8125rem" }}
                    />
                  </div>

                  {/* Status Toggle Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    {/* Present Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "present")}
                      style={{
                        padding: "0.4rem 0.875rem",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        border: student.status === "present" ? "1px solid var(--success)" : "1px solid var(--border)",
                        background: student.status === "present" ? "var(--success)" : "var(--surface-solid)",
                        color: student.status === "present" ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <CheckCircle2 size={14} /> Present
                    </button>

                    {/* Absent Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "absent")}
                      style={{
                        padding: "0.4rem 0.875rem",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        border: student.status === "absent" ? "1px solid var(--danger)" : "1px solid var(--border)",
                        background: student.status === "absent" ? "var(--danger)" : "var(--surface-solid)",
                        color: student.status === "absent" ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <XCircle size={14} /> Absent
                    </button>

                    {/* Late Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, "late")}
                      style={{
                        padding: "0.4rem 0.875rem",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        border: student.status === "late" ? "1px solid var(--warning)" : "1px solid var(--border)",
                        background: student.status === "late" ? "var(--warning)" : "var(--surface-solid)",
                        color: student.status === "late" ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <Clock size={14} /> Late
                    </button>

                    {/* WhatsApp Action Button if Absent */}
                    {isAbsent && (
                      <a
                        href={getWhatsAppUrl(student)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        title="Send WhatsApp Absent Alert"
                        style={{
                          padding: "0.4rem 0.625rem",
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
                        <MessageSquare size={14} /> WhatsApp
                      </a>
                    )}
                  </div>
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
