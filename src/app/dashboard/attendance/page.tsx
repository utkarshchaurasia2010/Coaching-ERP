"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  CalendarCheck, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Save, 
  Loader2, 
  MessageCircle,
  School,
  Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function DailyAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Mapping: studentId -> 'present' | 'absent' | 'late' | 'half_day' | 'leave'
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, leave: 0 });

  useEffect(() => {
    if (settings?.academic_year) {
      loadClasses();
    }
  }, [settings?.academic_year]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentsAndAttendance();
    }
  }, [selectedClassId, attendanceDate]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      // Fetch classes
      let { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('academic_year', settings!.academic_year)
        .order('numeric_grade');

      if (!classData || classData.length === 0) {
        // Fallback to batches
        const { data: batchData } = await supabase
          .from('batches')
          .select('id, name')
          .eq('academic_year', settings!.academic_year);
        classData = batchData || [];
      }

      setClasses(classData || []);
      const paramClassId = searchParams.get('classId');
      if (paramClassId && classData?.some(c => c.id === paramClassId)) {
        setSelectedClassId(paramClassId);
      } else if (classData && classData.length > 0) {
        setSelectedClassId(classData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndAttendance = async () => {
    try {
      setLoading(true);

      // Fetch students enrolled in this class or batch
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          students (
            id,
            admission_no,
            roll_no,
            full_name,
            parent_contact,
            parent_name,
            enrollment_status
          )
        `)
        .eq('batch_id', selectedClassId);

      const studentList: any[] = (enrollments || [])
        .map((e: any) => Array.isArray(e.students) ? e.students[0] : e.students)
        .filter((s: any) => s && s.enrollment_status === 'active')
        .sort((a: any, b: any) => (a.roll_no || 999) - (b.roll_no || 999));

      setStudents(studentList);

      // Fetch existing attendance records for date & class
      const { data: existingAttendance } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('date', attendanceDate)
        .in('student_id', studentList.map(s => s.id));

      const initialMap: Record<string, string> = {};
      const initialRemarks: Record<string, string> = {};

      studentList.forEach(s => {
        const found = existingAttendance?.find(a => a.student_id === s.id);
        initialMap[s.id] = found ? found.status : 'present'; // Default to present
        if (found?.remarks) initialRemarks[s.id] = found.remarks;
      });

      setAttendanceRecords(initialMap);
      setRemarks(initialRemarks);
      updateCounts(initialMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateCounts = (records: Record<string, string>) => {
    let p = 0, a = 0, l = 0, lv = 0;
    Object.values(records).forEach(status => {
      if (status === 'present') p++;
      else if (status === 'absent') a++;
      else if (status === 'late') l++;
      else if (status === 'leave' || status === 'half_day') lv++;
    });
    setStats({ present: p, absent: a, late: l, leave: lv });
  };

  const handleStatusChange = (studentId: string, status: string) => {
    const updated = { ...attendanceRecords, [studentId]: status };
    setAttendanceRecords(updated);
    updateCounts(updated);
  };

  const markAllPresent = () => {
    const updated: Record<string, string> = {};
    students.forEach(s => { updated[s.id] = 'present'; });
    setAttendanceRecords(updated);
    updateCounts(updated);
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payload = students.map(s => ({
        date: attendanceDate,
        student_id: s.id,
        section_id: null,
        status: attendanceRecords[s.id] || 'present',
        remarks: remarks[s.id] || null,
        marked_by: session?.user?.id || null
      }));

      // Upsert into daily_attendance
      const { error } = await supabase
        .from('daily_attendance')
        .upsert(payload, { onConflict: 'date,student_id' });

      if (error) throw error;
      alert("Attendance saved successfully!");

    } catch (err: any) {
      console.error(err);
      alert("Failed to save attendance: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsAppAbsenceAlert = (student: any) => {
    const contact = student.parent_contact;
    if (!contact) return alert("No contact number found for this parent.");

    let phone = contact.replace(/\s+/g, '');
    if (!phone.startsWith('+')) phone = `91${phone}`;
    else phone = phone.substring(1);

    const dateFormatted = new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const msg = `Dear ${student.parent_name || 'Parent'},\n\nThis is to notify you that your child ${student.full_name} is marked ABSENT today (${dateFormatted}) at ${settings?.name || 'School'}.\n\nIf this was unexpected, please contact the school office.\n\nWarm regards,\nPrincipal / Class Teacher`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
            Daily Attendance Register
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Morning roll-call register with instant WhatsApp absent alerts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={markAllPresent} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} /> Mark All Present
          </button>
          <button onClick={handleSaveAttendance} className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Register
          </button>
        </div>
      </div>

      {/* Control Bar: Class Picker & Date */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Class</label>
          <select 
            className="input" 
            style={{ marginTop: '0.35rem' }}
            value={selectedClassId} 
            onChange={e => setSelectedClassId(e.target.value)}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Date</label>
          <input 
            type="date" 
            className="input" 
            style={{ marginTop: '0.35rem' }}
            value={attendanceDate}
            onChange={e => setAttendanceDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Present</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{stats.present}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Absent</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{stats.absent}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Late Arrival</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{stats.late}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>On Leave / Half-day</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>{stats.leave}</div>
        </div>
      </div>

      {/* Students Roll Call Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 className="animate-spin text-muted" size={32} style={{ margin: '0 auto' }} />
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No active students found in this class.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Roll No</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'left' }}>Admission No</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Attendance Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const currentStatus = attendanceRecords[student.id] || 'present';
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {student.roll_no || idx + 1}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{student.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parent: {student.parent_name || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {student.admission_no || 'ADM-N/A'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', background: 'var(--surface)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            style={{
                              padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                              background: currentStatus === 'present' ? 'var(--success)' : 'transparent',
                              color: currentStatus === 'present' ? 'white' : 'var(--text-muted)'
                            }}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            style={{
                              padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                              background: currentStatus === 'absent' ? 'var(--danger)' : 'transparent',
                              color: currentStatus === 'absent' ? 'white' : 'var(--text-muted)'
                            }}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'late')}
                            style={{
                              padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                              background: currentStatus === 'late' ? 'var(--warning)' : 'transparent',
                              color: currentStatus === 'late' ? 'white' : 'var(--text-muted)'
                            }}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'leave')}
                            style={{
                              padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                              background: currentStatus === 'leave' ? '#6366f1' : 'transparent',
                              color: currentStatus === 'leave' ? 'white' : 'var(--text-muted)'
                            }}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {currentStatus === 'absent' && (
                          <button 
                            type="button"
                            onClick={() => sendWhatsAppAbsenceAlert(student)}
                            className="btn" 
                            style={{ background: '#25D366', color: 'white', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Send WhatsApp Absent Notice to Parent"
                          >
                            <MessageCircle size={14} /> Alert Parent
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
