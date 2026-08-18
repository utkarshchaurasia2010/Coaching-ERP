"use client";

import { useState, useEffect } from "react";
import {
  Calendar, IndianRupee, Loader2, Clock, CheckCircle, User,
  BookOpen, MapPin, Phone, Mail, GraduationCap, Users, AlertCircle,
  ChevronDown, ChevronUp, Pencil, Save, X, Award, BarChart3, Download, Megaphone
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function ParentDashboard() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"profile" | "academics" | "fees" | "schedule" | "notices">("notices");
  const [examResults, setExamResults] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    email: "",
    contact_number: "",
    address: "",
    parent_name: "",
    parent_contact: "",
    date_of_birth: "",
    gender: "",
  });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIndex = new Date().getDay();
  const todayName = DAYS[todayIndex === 0 ? 6 : todayIndex - 1]; // Sunday = index 0 in JS
  const [activeDay, setActiveDay] = useState(todayName);

  const currencySymbol = settings?.currency === 'USD' ? '$' : '₹';

  useEffect(() => {
    const fetchData = async () => {
      const studentId = sessionStorage.getItem('parent_student_id');
      if (!studentId || !settings?.academic_year) return;

      try {
        // 1. Full Student Profile with batch info
        const { data: studentData } = await supabase
          .from('students')
          .select(`
            *,
            enrollments (
              enrollment_date,
              batches (id, name, description, start_date, end_date, status)
            )
          `)
          .eq('id', studentId)
          .single();

        setStudent(studentData);

        // 2. Fees with transactions (correct field names!)
        const { data: feeData } = await supabase
          .from('fees')
          .select(`
            *,
            transactions (id, amount_paid, payment_method, receipt_number, payment_date)
          `)
          .eq('student_id', studentId)
          .eq('academic_year', settings.academic_year)
          .order('created_at', { ascending: false });

        if (feeData) setFees(feeData);

        // 3. Schedules via batch (using day_of_week, not date!)
        const batchId = studentData?.enrollments?.[0]?.batches?.id;
        if (batchId) {
          const { data: scheduleData } = await supabase
            .from('schedules')
            .select(`
              id, day_of_week, is_recurring, specific_date, start_time, end_time, room,
              subjects (name),
              users (full_name)
            `)
            .eq('batch_id', batchId)
            .eq('academic_year', settings.academic_year)
            .order('start_time', { ascending: true });

          if (scheduleData) setSchedules(scheduleData);
        }

        // 4. Exam Results
        const { data: resultsData } = await supabase
          .from('exam_results')
          .select(`
            *,
            exam_subjects (
              max_marks, exam_date,
              subjects(name),
              exams(id, name, date)
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (resultsData) setExamResults(resultsData);

        // 5. Notices
        let noticesQuery = supabase
          .from('notices')
          .select('*')
          .eq('is_active', true);
          
        if (batchId) {
          noticesQuery = noticesQuery.or(`target_audience.eq.all,target_audience.eq.parents,batch_id.eq.${batchId}`);
        } else {
          noticesQuery = noticesQuery.or(`target_audience.eq.all,target_audience.eq.parents`);
        }
        
        const { data: noticesData } = await noticesQuery.order('created_at', { ascending: false });
        if (noticesData) setNotices(noticesData);

      } catch (error) {
        console.error("Error fetching parent data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [settings?.academic_year]);

  const startEdit = () => {
    setEditData({
      email: student?.email || "",
      contact_number: student?.contact_number || "",
      address: student?.address || "",
      parent_name: student?.parent_name || "",
      parent_contact: student?.parent_contact || "",
      date_of_birth: student?.date_of_birth || "",
      gender: student?.gender || "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const studentId = sessionStorage.getItem('parent_student_id');
    if (!studentId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          email: editData.email || null,
          contact_number: editData.contact_number || null,
          address: editData.address || null,
          parent_name: editData.parent_name || null,
          parent_contact: editData.parent_contact || null,
          date_of_birth: editData.date_of_birth || null,
          gender: editData.gender || null,
        })
        .eq('id', studentId);

      if (error) throw error;

      // Update local student state
      setStudent((prev: any) => ({
        ...prev,
        email: editData.email,
        contact_number: editData.contact_number,
        address: editData.address,
        parent_name: editData.parent_name,
        parent_contact: editData.parent_contact,
        date_of_birth: editData.date_of_birth,
        gender: editData.gender,
      }));
      // Update localStorage name if parent name changed
      if (editData.parent_name) {
        localStorage.setItem('parent_student_name', student?.full_name || '');
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading student data...</p>
      </div>
    );
  }

  // Financial calculations (correct field: total_amount, amount_paid)
  const totalFees = fees.reduce((sum, fee) => sum + Number(fee.total_amount || 0), 0);
  const totalPaid = fees.reduce((sum, fee) => {
    const feePaid = (fee.transactions || []).reduce((s: number, t: any) => s + Number(t.amount_paid || 0), 0);
    return sum + feePaid;
  }, 0);
  const dueAmount = Math.max(0, totalFees - totalPaid);
  const allTransactions = fees.flatMap((fee: any) =>
    (fee.transactions || []).map((t: any) => ({ ...t, feeTitle: fee.title }))
  ).sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  // Schedule for active day
  const daySchedules = schedules.filter(s => s.day_of_week === activeDay);

  // Batch info
  const batch = student?.enrollments?.[0]?.batches;

  const tabs = [
    { key: "notices" as const, label: "Notices", icon: <Megaphone size={16} /> },
    { key: "profile" as const, label: "Profile", icon: <User size={16} /> },
    { key: "academics" as const, label: "Academics", icon: <Award size={16} /> },
    { key: "fees" as const, label: "Fees", icon: <IndianRupee size={16} /> },
    { key: "schedule" as const, label: "Schedule", icon: <Calendar size={16} /> },
  ];

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Quick Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <div style={{
          background: 'var(--surface-solid)', 
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '50%', marginBottom: '0.75rem' }}>
            <IndianRupee size={18} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total Fees</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>{currencySymbol}{totalFees.toLocaleString()}</div>
        </div>
        
        <div style={{
          background: 'var(--surface-solid)', 
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <div style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', padding: '0.5rem', borderRadius: '50%', marginBottom: '0.75rem' }}>
            <CheckCircle size={18} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Amount Paid</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>{currencySymbol}{totalPaid.toLocaleString()}</div>
        </div>
        
        <div style={{
          background: dueAmount > 0 ? 'rgba(239, 68, 68, 0.03)' : 'rgba(5, 150, 105, 0.03)',
          border: `1px solid ${dueAmount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(5, 150, 105, 0.15)'}`,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <div style={{ background: dueAmount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 150, 105, 0.1)', color: dueAmount > 0 ? 'var(--danger)' : 'var(--success)', padding: '0.5rem', borderRadius: '50%', marginBottom: '0.75rem' }}>
            <AlertCircle size={18} />
          </div>
          <div style={{ fontSize: '0.75rem', color: dueAmount > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            {dueAmount > 0 ? 'Pending Dues' : 'All Clear'}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: dueAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {currencySymbol}{dueAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tab Navigation Segmented Control */}
      <div style={{
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.04)',
        borderRadius: '0.75rem', padding: '0.25rem',
        position: 'relative'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              padding: '0.75rem 0.5rem',
              borderRadius: '0.5rem',
              border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: activeTab === tab.key ? 600 : 500,
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: activeTab === tab.key ? 2 : 1
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* === NOTICES TAB === */}
      {activeTab === "notices" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notices.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Megaphone size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No new announcements at this time.</p>
            </div>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{notice.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    {new Date(notice.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {notice.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* === PROFILE TAB === */}
      {activeTab === "profile" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Student Info Card */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: 'none', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', position: 'relative' }}>
            
            {/* Edit Button */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
              {!isEditing ? (
                <button onClick={startEdit} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Pencil size={14} /> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={cancelEdit} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <X size={16} />
                  </button>
                  <button onClick={saveEdit} className="btn btn-primary" disabled={saving} style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save
                  </button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              {student?.photo_url ? (
                <img src={student.photo_url} alt={student.full_name}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
              ) : (
                <div style={{
                  width: '96px', height: '96px', borderRadius: '50%',
                  background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '2.5rem', border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  {student?.full_name?.charAt(0) || 'S'}
                </div>
              )}
            </div>
            
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {student?.full_name}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {student?.current_class && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Class {student.current_class}</span>
              )}
              {batch && (
                <span style={{
                  background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)',
                  padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600
                }}>
                  {batch.name}
                </span>
              )}
              <span style={{
                background: student?.enrollment_status === 'active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: student?.enrollment_status === 'active' ? 'var(--success)' : 'var(--danger)',
                padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                {student?.enrollment_status || 'Unknown'}
              </span>
            </div>


            {/* Contact Details — View or Edit Mode */}
            {!isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {student?.email && (
                  <InfoRow icon={<Mail size={15} />} label="Email" value={student.email} />
                )}
                {student?.contact_number && (
                  <InfoRow icon={<Phone size={15} />} label="Phone" value={student.contact_number} />
                )}
                {student?.date_of_birth && (
                  <InfoRow icon={<Calendar size={15} />} label="Date of Birth"
                    value={new Date(student.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                )}
                {student?.gender && (
                  <InfoRow icon={<User size={15} />} label="Gender" value={student.gender} />
                )}
                {student?.address && (
                  <InfoRow icon={<MapPin size={15} />} label="Address" value={student.address} />
                )}
                {student?.roll_number && (
                  <InfoRow icon={<GraduationCap size={15} />} label="Roll Number" value={student.roll_number} />
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <EditField icon={<Mail size={15} />} label="Email" type="email" placeholder="student@email.com"
                  value={editData.email} onChange={v => setEditData({...editData, email: v})} />
                <EditField icon={<Phone size={15} />} label="Phone" type="tel" placeholder="+91 98765 43210"
                  value={editData.contact_number} onChange={v => setEditData({...editData, contact_number: v})} />
                <EditField icon={<Calendar size={15} />} label="Date of Birth" type="date"
                  value={editData.date_of_birth} onChange={v => setEditData({...editData, date_of_birth: v})} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <div style={{ color: 'var(--text-muted)', marginTop: '1.75rem', flexShrink: 0 }}><User size={15} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Gender</div>
                    <select className="input" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                      value={editData.gender} onChange={e => setEditData({...editData, gender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <EditField icon={<MapPin size={15} />} label="Address" placeholder="Full residential address"
                    value={editData.address} onChange={v => setEditData({...editData, address: v})} />
                </div>
                {student?.roll_number && (
                  <InfoRow icon={<GraduationCap size={15} />} label="Roll Number" value={student.roll_number} />
                )}
              </div>
            )}
          </div>

          {/* Parent / Guardian Info */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--foreground)' }}>
              <Users size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Parent / Guardian</h3>
            </div>
            {!isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {student?.parent_name && (
                  <InfoRow icon={<User size={15} />} label="Name" value={student.parent_name} />
                )}
                {student?.parent_contact && (
                  <InfoRow icon={<Phone size={15} />} label="Contact" value={student.parent_contact} />
                )}
                {!student?.parent_name && !student?.parent_contact && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    No parent details on file. Tap Edit to add.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <EditField icon={<User size={15} />} label="Parent Name" placeholder="e.g. Richard Doe"
                  value={editData.parent_name} onChange={v => setEditData({...editData, parent_name: v})} />
                <EditField icon={<Phone size={15} />} label="Parent Contact" type="tel" placeholder="+91 98765 43210"
                  value={editData.parent_contact} onChange={v => setEditData({...editData, parent_contact: v})} />
              </div>
            )}
          </div>

          {/* Academic Info — Read Only */}
          {(student?.previous_school || student?.board || student?.previous_grades) && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--foreground)' }}>
                <BookOpen size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Academic History</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {student.previous_school && (
                  <InfoRow icon={<GraduationCap size={15} />} label="Previous School" value={student.previous_school} />
                )}
                {student.board && (
                  <InfoRow icon={<BookOpen size={15} />} label="Board" value={student.board} />
                )}
                {student.previous_grades && (
                  <InfoRow icon={<CheckCircle size={15} />} label="Previous Grades" value={student.previous_grades} />
                )}
              </div>
            </div>
          )}

          {/* Batch Info — Read Only */}
          {batch && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--foreground)' }}>
                <Users size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Current Batch</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InfoRow icon={<BookOpen size={15} />} label="Batch Name" value={batch.name} />
                {batch.description && (
                  <InfoRow icon={<BookOpen size={15} />} label="Description" value={batch.description} />
                )}
                {batch.start_date && (
                  <InfoRow icon={<Calendar size={15} />} label="Start Date"
                    value={new Date(batch.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                )}
                {batch.end_date && (
                  <InfoRow icon={<Calendar size={15} />} label="End Date"
                    value={new Date(batch.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === ACADEMICS TAB === */}
      {activeTab === "academics" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Exam Results</h3>
            </div>
            
            {examResults.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <BarChart3 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.15 }} />
                <p style={{ fontSize: '0.875rem' }}>No exam results found for this academic year.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
                {Object.values(
                  examResults.reduce((acc, result) => {
                    const examName = result.exam_subjects?.exams?.name;
                    if (!examName) return acc;
                    if (!acc[examName]) {
                      acc[examName] = {
                        id: result.exam_subjects?.exams?.id,
                        name: examName,
                        date: result.exam_subjects?.exams?.date || result.exam_subjects?.exam_date,
                        total_obtained: 0,
                        total_max: 0,
                        results: []
                      };
                    }
                    acc[examName].results.push(result);
                    acc[examName].total_obtained += Number(result.marks_obtained || 0);
                    acc[examName].total_max += Number(result.exam_subjects?.max_marks || 0);
                    return acc;
                  }, {} as Record<string, any>)
                ).map((examGroup: any, idx) => {
                  const overallPct = examGroup.total_max > 0 ? (examGroup.total_obtained / examGroup.total_max) * 100 : 0;
                  const getScoreColor = (pct: number) => {
                    if (pct >= 80) return 'var(--success)';
                    if (pct >= 60) return 'var(--primary)';
                    if (pct >= 40) return 'var(--warning)';
                    return 'var(--danger)';
                  };
                  
                  return (
                    <div key={idx} style={{ 
                      border: '1px solid var(--border)', borderRadius: 'var(--radius)', 
                      overflow: 'hidden', background: 'var(--surface)' 
                    }}>
                      <div style={{ padding: '1rem 1.25rem', background: 'var(--surface-solid)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>{examGroup.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(examGroup.date).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <button 
                            onClick={() => window.open(`/print/student-exam/${examGroup.id}/${student?.id}`, '_blank')}
                            className="btn btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer' }}
                          >
                            <Download size={14} /> Download PDF
                          </button>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: getScoreColor(overallPct) }}>
                              {overallPct.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {examGroup.total_obtained} / {examGroup.total_max} Total
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ padding: '0.5rem 0' }}>
                        {examGroup.results.map((r: any) => {
                          const pct = (r.marks_obtained / r.exam_subjects?.max_marks) * 100;
                          const color = getScoreColor(pct);
                          return (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px dashed var(--border)' }}>
                              <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>{r.exam_subjects?.subjects?.name}</div>
                                {r.remarks && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{r.remarks}"</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color }}>{r.marks_obtained} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>/ {r.exam_subjects?.max_marks}</span></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === FEES TAB === */}
      {activeTab === "fees" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Fee Items */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IndianRupee size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Fee Breakdown</h3>
              <span style={{
                marginLeft: 'auto', background: 'var(--surface)', border: '1px solid var(--border)',
                padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--text-muted)'
              }}>
                {fees.length} item{fees.length !== 1 ? 's' : ''}
              </span>
            </div>

            {fees.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <IndianRupee size={36} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
                <p>No fees assigned for this academic year.</p>
              </div>
            ) : (
              <div>
                {fees.map((fee) => {
                  const paid = (fee.transactions || []).reduce((s: number, t: any) => s + Number(t.amount_paid || 0), 0);
                  const total = Number(fee.total_amount);
                  const remaining = Math.max(0, total - paid);
                  const percentage = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                  const isExpanded = expandedFee === fee.id;

                  return (
                    <div key={fee.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <button
                        onClick={() => setExpandedFee(isExpanded ? null : fee.id)}
                        style={{
                          width: '100%', border: 'none', background: isExpanded ? 'var(--surface)' : 'transparent',
                          padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9375rem' }}>{fee.title}</span>
                            <span style={{
                              background: fee.status === 'paid' ? 'rgba(5, 150, 105, 0.1)' : fee.status === 'partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: fee.status === 'paid' ? 'var(--success)' : fee.status === 'partial' ? 'var(--warning)' : 'var(--danger)',
                              padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.6875rem',
                              fontWeight: 600, textTransform: 'uppercase'
                            }}>
                              {fee.status}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              flex: 1, height: '6px', borderRadius: '999px',
                              background: 'var(--border)', overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`, height: '100%', borderRadius: '999px',
                                background: fee.status === 'paid' ? 'var(--success)' : fee.status === 'partial' ? 'var(--warning)' : 'var(--danger)',
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {currencySymbol}{paid.toLocaleString()} / {currencySymbol}{total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {fee.transactions && fee.transactions.length > 0 && (
                          isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>

                      {/* Expanded: transaction details */}
                      {isExpanded && fee.transactions && fee.transactions.length > 0 && (
                        <div style={{ padding: '0 1.5rem 1.25rem', background: 'var(--surface)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Payment History
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {fee.transactions.map((txn: any) => (
                              <div key={txn.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem', background: 'var(--background)',
                                borderRadius: 'calc(var(--radius) - 2px)', border: '1px solid var(--border)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                                  <div>
                                    <div style={{ fontWeight: 500, fontSize: '0.8125rem', color: 'var(--foreground)' }}>
                                      {txn.payment_method ? txn.payment_method.charAt(0).toUpperCase() + txn.payment_method.slice(1) : 'Payment'}
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                      {txn.payment_date ? new Date(txn.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                      {txn.receipt_number && ` · ${txn.receipt_number}`}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.875rem' }}>
                                  +{currencySymbol}{Number(txn.amount_paid).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                          {remaining > 0 && (
                            <div style={{
                              marginTop: '0.75rem', padding: '0.75rem 1rem',
                              background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.12)',
                              borderRadius: 'calc(var(--radius) - 2px)',
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 500
                            }}>
                              <AlertCircle size={14} />
                              Remaining: {currencySymbol}{remaining.toLocaleString()}
                              {fee.due_date && (
                                <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: '0.75rem' }}>
                                  Due: {new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === SCHEDULE TAB === */}
      {activeTab === "schedule" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Day selector */}
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', padding: '0.5rem 0.5rem 0' }} className="hide-scrollbar">
              {DAYS.map(day => {
                const count = schedules.filter(s => s.day_of_week === day).length;
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    style={{
                      flex: '0 0 auto',
                      minWidth: '72px',
                      padding: '0.75rem 0.5rem 0.625rem',
                      border: 'none', cursor: 'pointer',
                      borderBottom: activeDay === day ? '2px solid var(--primary)' : '2px solid transparent',
                      background: 'transparent',
                      fontWeight: activeDay === day ? 600 : 400,
                      color: activeDay === day ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '0.8125rem',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{day.slice(0, 3)}</span>
                    {count > 0 && (
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: activeDay === day ? 'var(--primary)' : 'var(--border)',
                        color: activeDay === day ? 'white' : 'var(--text-muted)',
                        fontSize: '0.625rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Schedule list */}
            <div style={{ padding: '1.25rem' }}>
              {daySchedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                  <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.15 }} />
                  <p style={{ fontSize: '0.875rem' }}>No classes on {activeDay}.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {daySchedules.map((schedule) => (
                    <div key={schedule.id} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '1rem 1.25rem',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                      background: 'var(--surface)'
                    }}>
                      {/* Time block */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        minWidth: '80px', paddingRight: '1rem', borderRight: '1px dashed var(--border)'
                      }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {schedule.start_time?.slice(0, 5)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          to {schedule.end_time?.slice(0, 5)}
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--foreground)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span>{schedule.subjects?.name || 'Unknown Subject'}</span>
                          {schedule.is_recurring !== false ? (
                            <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', fontWeight: 500 }}>
                              Every {schedule.day_of_week}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontWeight: 500 }}>
                              {schedule.specific_date ? new Date(schedule.specific_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'One-Time'}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {schedule.users?.full_name && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <User size={13} /> {schedule.users.full_name}
                            </span>
                          )}
                          {schedule.room && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={13} /> {schedule.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable info row component */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
      <div style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>{label}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)', wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

/* Reusable editable field component */
function EditField({ icon, label, value, onChange, type = "text", placeholder = "" }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
      <div style={{ color: 'var(--text-muted)', marginTop: '1.75rem', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{label}</div>
        <input
          type={type}
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
        />
      </div>
    </div>
  );
}

