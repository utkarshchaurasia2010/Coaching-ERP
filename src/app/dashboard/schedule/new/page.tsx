"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, BookOpen, Clock, Users, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";

import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function AddSchedulePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    batchId: "",
    subjectId: "",
    teacherId: "",
    isRecurring: true,
    specificDate: "",
    dayOfWeek: "Monday",
    startTime: "",
    endTime: "",
    room: ""
  });

  useEffect(() => {
    if (settings?.academic_year) {
      const fetchData = async () => {
        const [
          { data: batchesData },
          { data: subjectsData },
          { data: teachersData }
        ] = await Promise.all([
          supabase.from('batches').select('id, name').eq('status', 'active').eq('academic_year', settings.academic_year),
          supabase.from('subjects').select('id, name'),
          supabase.from('users').select('id, full_name').in('role', ['teacher', 'admin'])
        ]);
        
        if (batchesData) setBatches(batchesData);
        if (subjectsData) setSubjects(subjectsData);
        if (teachersData) setTeachers(teachersData);
      };
      fetchData();
    }
  }, [settings?.academic_year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.batchId || !formData.subjectId || !formData.startTime || !formData.endTime) {
        throw new Error("Please fill in all required fields.");
      }

      if (!formData.isRecurring && !formData.specificDate) {
        throw new Error("Please select a specific date for this class.");
      }

      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let derivedDay = formData.dayOfWeek;
      if (!formData.isRecurring && formData.specificDate) {
        const d = new Date(formData.specificDate + 'T00:00:00');
        derivedDay = DAYS[d.getDay()];
      }

      let { error } = await supabase
        .from('schedules')
        .insert([{ 
          batch_id: formData.batchId,
          subject_id: formData.subjectId,
          teacher_id: formData.teacherId || null,
          day_of_week: derivedDay,
          is_recurring: formData.isRecurring,
          specific_date: formData.isRecurring ? null : formData.specificDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          room: formData.room || null,
          academic_year: settings?.academic_year || '2025-26'
        }]);

      if (error && error.message?.includes('is_recurring')) {
        // Fallback for when column is not yet added in Supabase
        const fallback = await supabase
          .from('schedules')
          .insert([{ 
            batch_id: formData.batchId,
            subject_id: formData.subjectId,
            teacher_id: formData.teacherId || null,
            day_of_week: derivedDay,
            start_time: formData.startTime,
            end_time: formData.endTime,
            room: formData.room || null,
            academic_year: settings?.academic_year || '2025-26'
          }]);
        if (fallback.error) throw fallback.error;
        error = null;
      } else if (error) {
        throw error;
      }

      alert('Class scheduled successfully!');
      setIsDirty(false);
      router.replace('/dashboard/schedule');
      
    } catch (error: any) {
      console.error('Error scheduling class:', error);
      alert('Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => attemptBack()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Schedule Class</h1>
          <p style={{ color: 'var(--text-muted)' }}>Add a recurring weekly routine or a one-time class on a specific date.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label>Schedule Type *</label>
            <div className="form-grid-2" style={{ gap: '1rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isRecurring: true })}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius)',
                  border: formData.isRecurring ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: formData.isRecurring ? 'rgba(79, 70, 229, 0.06)' : 'var(--surface-solid)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, color: formData.isRecurring ? 'var(--primary)' : 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔄 Weekly Recurring
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Repeats every week on selected weekday
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isRecurring: false })}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius)',
                  border: !formData.isRecurring ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: !formData.isRecurring ? 'rgba(79, 70, 229, 0.06)' : 'var(--surface-solid)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, color: !formData.isRecurring ? 'var(--primary)' : 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📅 Specific Date / One-Time
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Occurs once on a specific calendar date
                </div>
              </button>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label>Select Batch *</label>
              <CustomSelect
                icon={<Users size={16} />}
                options={batches.map(b => ({ value: b.id, label: b.name }))}
                value={formData.batchId}
                onChange={(val) => setFormData({...formData, batchId: val})}
                placeholder="Select a batch"
              />
            </div>

            <div className="input-group">
              <label>Select Subject *</label>
              <CustomSelect
                icon={<BookOpen size={16} />}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                value={formData.subjectId}
                onChange={(val) => setFormData({...formData, subjectId: val})}
                placeholder="Select a subject"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Assign Teacher (Optional)</label>
            <CustomSelect
              options={teachers.map(t => ({ value: t.id, label: t.full_name }))}
              value={formData.teacherId}
              onChange={(val) => setFormData({...formData, teacherId: val})}
              placeholder="Select a teacher"
            />
          </div>

          <div className="form-grid-3">
            {formData.isRecurring ? (
              <div className="input-group">
                <label>Day of Week *</label>
                <CustomSelect
                  icon={<Calendar size={16} />}
                  options={[
                    { value: 'Monday', label: 'Monday' },
                    { value: 'Tuesday', label: 'Tuesday' },
                    { value: 'Wednesday', label: 'Wednesday' },
                    { value: 'Thursday', label: 'Thursday' },
                    { value: 'Friday', label: 'Friday' },
                    { value: 'Saturday', label: 'Saturday' },
                    { value: 'Sunday', label: 'Sunday' }
                  ]}
                  value={formData.dayOfWeek}
                  onChange={(val) => setFormData({...formData, dayOfWeek: val})}
                  placeholder="Select Day"
                />
              </div>
            ) : (
              <div className="input-group">
                <label>Select Date *</label>
                <div className="input-wrapper">
                  <input 
                    type="date" 
                    className="input"
                    style={{ paddingLeft: '1.25rem' }}
                    required 
                    value={formData.specificDate} 
                    onChange={e => setFormData({...formData, specificDate: e.target.value})} 
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label>Start Time *</label>
              <div className="input-wrapper">
                <input 
                  type="time" 
                  className="input"
                  style={{ paddingLeft: '1.25rem' }}
                  required 
                  value={formData.startTime} 
                  onChange={e => setFormData({...formData, startTime: e.target.value})} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>End Time *</label>
              <div className="input-wrapper">
                <input 
                  type="time" 
                  className="input"
                  style={{ paddingLeft: '1.25rem' }}
                  required 
                  value={formData.endTime} 
                  onChange={e => setFormData({...formData, endTime: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Room / Location (Optional)</label>
            <div className="input-wrapper">
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Room 101 or Lab A"
                style={{ paddingLeft: '1.25rem' }}
                value={formData.room} 
                onChange={e => setFormData({...formData, room: e.target.value})} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Class Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
