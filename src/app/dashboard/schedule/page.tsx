"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Calendar, Clock, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function SchedulePage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [activeDay, setActiveDay] = useState<string>(
    DAYS[new Date().getDay() - 1] || 'Monday'
  );

  useEffect(() => {
    if (settings?.academic_year) {
      loadSchedules();
    }
  }, [settings?.academic_year]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
        
      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error("Error loading schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const daySchedules = schedules.filter(s => s.day_of_week === activeDay);

  // Calculate current week range
  const today = new Date();
  const dayIdx = today.getDay();
  const mondayOffset = dayIdx === 0 ? -6 : 1 - dayIdx;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const weekLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}, ${weekEnd.getFullYear()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Weekly Timetable</h1>
          <p className="text-muted">Week: {weekLabel} · Manage class schedules and teacher assignments.</p>
        </div>
        <div>
          <Link href="/dashboard/schedule/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={18} />
            Add Class to Schedule
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)' }} className="hide-scrollbar">
          {DAYS.map(day => (
            <button 
              key={day}
              className={`tab-btn ${activeDay === day ? 'active' : ''}`} 
              style={{ 
                flex: 1, 
                minWidth: '100px',
                padding: '1rem', 
                borderBottom: activeDay === day ? '2px solid var(--primary)' : 'none', 
                background: activeDay === day ? 'var(--background)' : 'transparent', 
                fontWeight: activeDay === day ? 600 : 400, 
                color: activeDay === day ? 'var(--primary)' : 'var(--text-muted)' 
              }}
              onClick={() => setActiveDay(day)}
            >
              {day}
            </button>
          ))}
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
              {daySchedules.map((schedule) => (
                <div key={schedule.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1.5rem', 
                  padding: '1.5rem', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface-solid)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minWidth: '120px',
                    paddingRight: '1.5rem',
                    borderRight: '1px dashed var(--border)'
                  }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {schedule.start_time.slice(0, 5)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      to {schedule.end_time.slice(0, 5)}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{schedule.subjects?.name || 'Unknown Subject'}</div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <BookOpen size={16} /> {schedule.batches?.name || 'Unassigned Batch'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={16} /> Room: {schedule.room || 'TBA'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Instructor</div>
                    <div style={{ fontWeight: 500 }}>{schedule.users?.full_name || 'Not Assigned'}</div>
                    <Link href={`/dashboard/schedule/${schedule.id}/edit`} className="btn btn-outline" style={{ marginTop: '0.5rem' }}>Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
