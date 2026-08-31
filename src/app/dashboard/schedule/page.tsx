"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Calendar, Clock, BookOpen, Loader2, Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function SchedulePage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIndex = new Date().getDay();
  const defaultDay = DAYS[todayIndex === 0 ? 6 : todayIndex - 1];
  const [activeDay, setActiveDay] = useState<string>(defaultDay);

  useEffect(() => {
    if (settings?.academic_year) {
      loadSchedules();
    }
  }, [settings?.academic_year]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      let scheduleList: any[] = [];
      const res = await supabase
        .from('schedules')
        .select(`
          id, 
          day_of_week, 
          is_recurring,
          specific_date,
          start_time, 
          end_time, 
          room,
          batches (name),
          subjects (name),
          users (full_name)
        `)
        .eq('academic_year', settings!.academic_year)
        .order('start_time', { ascending: true });
        
      if (res.error) {
        // Fallback in case migration columns are not yet applied in remote DB
        const fallback = await supabase
          .from('schedules')
          .select(`
            id, 
            day_of_week, 
            start_time, 
            end_time, 
            room,
            batches (name),
            subjects (name),
            users (full_name)
          `)
          .eq('academic_year', settings!.academic_year)
          .order('start_time', { ascending: true });
        if (fallback.error) throw fallback.error;
        scheduleList = fallback.data || [];
      } else {
        scheduleList = res.data || [];
      }
      setSchedules(scheduleList);
    } catch (err: any) {
      console.error("Error loading schedules:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class schedule?')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete schedule: ' + err.message);
    }
  };

  const daySchedules = schedules.filter(s => s.day_of_week === activeDay);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Timetable & Schedules</h1>
          <p className="text-muted">Manage recurring weekly routines and specific date classes for {settings?.academic_year || 'Academic Year'}.</p>
        </div>
        <div>
          <Link href="/dashboard/schedule/new" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Schedule Class
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)' }} className="hide-scrollbar">
          {DAYS.map(day => {
            const count = schedules.filter(s => s.day_of_week === day).length;
            return (
              <button 
                key={day}
                className={`tab-btn ${activeDay === day ? 'active' : ''}`} 
                style={{ 
                  flex: 1, 
                  minWidth: '110px', 
                  padding: '1rem', 
                  borderBottom: activeDay === day ? '2px solid var(--primary)' : 'none', 
                  background: activeDay === day ? 'var(--background)' : 'transparent', 
                  fontWeight: activeDay === day ? 600 : 400, 
                  color: activeDay === day ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => setActiveDay(day)}
              >
                <span>{day}</span>
                {count > 0 && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.1rem 0.45rem', 
                    borderRadius: '999px', 
                    background: activeDay === day ? 'var(--primary)' : 'rgba(100, 116, 139, 0.15)',
                    color: activeDay === day ? '#fff' : 'var(--text-muted)',
                    fontWeight: 600
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin text-muted" size={32} />
            </div>
          ) : daySchedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p>No classes scheduled for {activeDay}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {daySchedules.map((schedule) => {
                const isRecurring = schedule.is_recurring !== false; // Default true if null
                return (
                  <div key={schedule.id} className="schedule-card">
                    <div className="schedule-time-col">
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {schedule.start_time.slice(0, 5)}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        to {schedule.end_time.slice(0, 5)}
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>{schedule.subjects?.name || 'Unknown Subject'}</span>
                        
                        {isRecurring ? (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '999px', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            color: 'var(--primary)', 
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            🔄 Every {schedule.day_of_week}
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '999px', 
                            background: 'rgba(245, 158, 11, 0.1)', 
                            color: '#d97706', 
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            📅 One-Time: {schedule.specific_date ? new Date(schedule.specific_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : schedule.day_of_week}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <BookOpen size={16} /> {schedule.batches?.name || 'Unassigned Batch'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={16} /> Room: {schedule.room || 'TBA'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher</div>
                        <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{schedule.users?.full_name || 'Not Assigned'}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link 
                          href={`/dashboard/schedule/${schedule.id}/edit`} 
                          className="btn btn-outline" 
                          style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          title="Edit Schedule"
                        >
                          <Edit size={16} />
                          <span>Edit</span>
                        </Link>
                        <button 
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="btn btn-outline" 
                          style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'var(--border)' }}
                          title="Delete Schedule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
