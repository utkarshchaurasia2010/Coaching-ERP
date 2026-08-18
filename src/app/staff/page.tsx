"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LogOut, 
  Calendar, 
  Clock, 
  BookOpen, 
  Users, 
  CheckCircle,
  Loader2,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  IndianRupee
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function StaffPortal() {
  const router = useRouter();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"schedule" | "exams">("schedule");
  const [exams, setExams] = useState<any[]>([]);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIndex = new Date().getDay();
  const todayName = DAYS[todayIndex === 0 ? 6 : todayIndex - 1]; 
  const [activeDay, setActiveDay] = useState(todayName);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, teacher_profiles(*)')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData || userData.role !== 'teacher') {
          router.push('/dashboard'); 
          return;
        }

        setStaff(userData);

        if (settings?.academic_year) {
          // Fetch Schedules
          const { data: scheduleData } = await supabase
            .from('schedules')
            .select(`
              id, day_of_week, is_recurring, specific_date, start_time, end_time, room,
              batches (name), subjects (name), teacher_id
            `)
            .eq('academic_year', settings.academic_year)
            .eq('teacher_id', userData.id)
            .order('start_time', { ascending: true });
          
          if (scheduleData) setSchedules(scheduleData);

          // Fetch Exams (exam_subjects)
          const { data: examData } = await supabase
            .from('exam_subjects')
            .select(`
              id, max_marks, exam_date, exam_id,
              exams (name, date, batches(name)),
              subjects(name)
            `)
            .order('created_at', { ascending: false });

          if (examData) setExams(examData);
        }

      } catch (error) {
        console.error("Error loading staff portal:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [settings?.academic_year, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  const daySchedules = schedules.filter(s => s.day_of_week === activeDay);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <header style={{ 
        background: 'var(--surface)', 
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10 
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {staff?.full_name?.charAt(0) || 'T'}
            </div>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>{staff?.full_name}</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Portal</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link 
              href="/dashboard/financials" 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', padding: '0.45rem 0.85rem', textDecoration: 'none' }}
            >
              <IndianRupee size={15} />
              <span>Financials</span>
            </Link>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%', border: 'none', background: 'var(--background)' }} title="Sign Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-solid)', padding: '0.25rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => setActiveTab("schedule")}
            style={{
              flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center',
              background: activeTab === "schedule" ? 'var(--primary)' : 'transparent',
              color: activeTab === "schedule" ? 'white' : 'var(--text-muted)',
              border: 'none', borderRadius: 'calc(var(--radius) - 2px)', fontWeight: activeTab === "schedule" ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Calendar size={18} /> My Schedule
          </button>
          <button 
            onClick={() => setActiveTab("exams")}
            style={{
              flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center',
              background: activeTab === "exams" ? 'var(--primary)' : 'transparent',
              color: activeTab === "exams" ? 'white' : 'var(--text-muted)',
              border: 'none', borderRadius: 'calc(var(--radius) - 2px)', fontWeight: activeTab === "exams" ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <ClipboardList size={18} /> Exam Results
          </button>
        </div>

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Weekly Timetable</h2>
            </div>
            
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  style={{
                    flex: '1 0 auto', padding: '1rem', minWidth: '100px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: activeDay === day ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: activeDay === day ? 600 : 400,
                    borderBottom: activeDay === day ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  {day}
                </button>
              ))}
            </div>

            <div style={{ padding: '1.25rem' }}>
              {daySchedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.15 }} />
                  <p>No classes scheduled for {activeDay}.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {daySchedules.map((schedule) => (
                    <div key={schedule.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingRight: '1.5rem', borderRight: '1px dashed var(--border)', minWidth: '90px' }}>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>{schedule.start_time.substring(0, 5)}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to {schedule.end_time.substring(0, 5)}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{schedule.subjects?.name || 'Class'}</h4>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Users size={14} /> {schedule.batches?.name}</span>
                          {schedule.room && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><CheckCircle size={14} /> Room {schedule.room}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === "exams" && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Exams & Results</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Click an exam to enter marks.</p>
            </div>
            
            {exams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <ClipboardList size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.15 }} />
                <p>No exams found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {exams.map((examSub: any) => (
                  <div 
                    key={examSub.id}
                    onClick={() => router.push(`/dashboard/academics/exams/${examSub.exam_id}?subject=${examSub.id}`)}
                    style={{ 
                      padding: '1.25rem 1.5rem', 
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', transition: 'background 0.1s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--surface-solid)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                        {examSub.exams?.name} - {examSub.subjects?.name}
                      </h4>
                      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <span>{examSub.exams?.batches?.name}</span>
                        <span>Max Marks: {examSub.max_marks}</span>
                        <span>{new Date(examSub.exam_date || examSub.exams?.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
