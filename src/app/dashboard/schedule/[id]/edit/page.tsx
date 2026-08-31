"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, BookOpen, Clock, Users, Calendar, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";
import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function EditSchedulePage() {
  const router = useRouter();
  const { id } = useParams(); // schedule id
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  const [initialLoading, setInitialLoading] = useState(true);

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
    room: "",
    academicYear: settings?.academic_year || "",
  });

  // Load reference data (batches, subjects, teachers)
  useEffect(() => {
    if (!settings?.academic_year) return;
    const fetchRefs = async () => {
      const [{ data: batchesData }, { data: subjectsData }, { data: teachersData }] = await Promise.all([
        supabase.from('batches').select('id, name').eq('status', 'active').eq('academic_year', settings.academic_year),
        supabase.from('subjects').select('id, name'),
        supabase.from('users').select('id, full_name').in('role', ['teacher', 'admin'])
      ]);
      if (batchesData) setBatches(batchesData);
      if (subjectsData) setSubjects(subjectsData);
      if (teachersData) setTeachers(teachersData);
    };
    fetchRefs();
  }, [settings?.academic_year]);

  // Load existing schedule data
  useEffect(() => {
    if (!id) return;
    const fetchSchedule = async () => {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select(`batch_id, subject_id, teacher_id, day_of_week, is_recurring, specific_date, start_time, end_time, room, academic_year`)
          .eq('id', id)
          .single();
        if (error) throw error;
        setFormData({
          batchId: data.batch_id ?? "",
          subjectId: data.subject_id ?? "",
          teacherId: data.teacher_id ?? "",
          isRecurring: data.is_recurring ?? true,
          specificDate: data.specific_date ?? "",
          dayOfWeek: data.day_of_week ?? "Monday",
          startTime: data.start_time ?? "",
          endTime: data.end_time ?? "",
          room: data.room ?? "",
          academicYear: data.academic_year ?? settings?.academic_year ?? "",
        });
      } catch (err) {
        console.error("Error loading schedule", err);
        alert("Failed to load schedule data.");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchSchedule();
  }, [id, settings?.academic_year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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
        .update({
          batch_id: formData.batchId,
          subject_id: formData.subjectId,
          teacher_id: formData.teacherId || null,
          is_recurring: formData.isRecurring,
          specific_date: formData.isRecurring ? null : formData.specificDate,
          day_of_week: derivedDay,
          start_time: formData.startTime,
          end_time: formData.endTime,
          room: formData.room || null,
          academic_year: formData.academicYear,
        })
        .eq('id', id);

      if (error && error.message?.includes('is_recurring')) {
        const fallback = await supabase
          .from('schedules')
          .update({
            batch_id: formData.batchId,
            subject_id: formData.subjectId,
            teacher_id: formData.teacherId || null,
            day_of_week: derivedDay,
            start_time: formData.startTime,
            end_time: formData.endTime,
            room: formData.room || null,
            academic_year: formData.academicYear,
          })
          .eq('id', id);
        if (fallback.error) throw fallback.error;
        error = null;
      } else if (error) {
        throw error;
      }

      alert('Schedule updated successfully');
      setIsDirty(false);
      router.replace('/dashboard/schedule');
    } catch (err: any) {
      console.error(err);
      alert('Failed to update schedule: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this class schedule? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      alert('Class schedule deleted successfully.');
      setIsDirty(false);
      router.replace('/dashboard/schedule');
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete schedule: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => attemptBack()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Edit Class Schedule</h1>
          <p style={{ color: 'var(--text-muted)' }}>Modify or remove an existing class entry.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Schedule Type Selection */}
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
                onChange={val => setFormData({ ...formData, batchId: val })}
                placeholder="Select a batch"
              />
            </div>
            <div className="input-group">
              <label>Select Subject *</label>
              <CustomSelect
                icon={<BookOpen size={16} />}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                value={formData.subjectId}
                onChange={val => setFormData({ ...formData, subjectId: val })}
                placeholder="Select a subject"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Assign Teacher (Optional)</label>
            <CustomSelect
              options={teachers.map(t => ({ value: t.id, label: t.full_name }))}
              value={formData.teacherId}
              onChange={val => setFormData({ ...formData, teacherId: val })}
              placeholder="Select a teacher"
            />
          </div>

          <div className="form-grid-3">
            {formData.isRecurring ? (
              <div className="input-group">
                <label>Day of Week *</label>
                <CustomSelect
                  icon={<Calendar size={16} />}
                  options={['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => ({ value: d, label: d }))}
                  value={formData.dayOfWeek}
                  onChange={val => setFormData({ ...formData, dayOfWeek: val })}
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
                    onChange={e => setFormData({ ...formData, specificDate: e.target.value })} 
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label>Start Time *</label>
              <div className="input-wrapper">
                <input type="time" className="input" style={{ paddingLeft: '1.25rem' }} required value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label>End Time *</label>
              <div className="input-wrapper">
                <input type="time" className="input" style={{ paddingLeft: '1.25rem' }} required value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Room / Location (Optional)</label>
            <div className="input-wrapper">
              <input type="text" className="input" style={{ paddingLeft: '1.25rem' }} placeholder="e.g. Room 101 or Lab A" value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={handleDelete} 
              disabled={loading}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Trash2 size={16} />
              Delete Class
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Update Schedule
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
