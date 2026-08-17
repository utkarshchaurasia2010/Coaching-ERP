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

      const { error } = await supabase
        .from('schedules')
        .insert([{ 
          batch_id: formData.batchId,
          subject_id: formData.subjectId,
          teacher_id: formData.teacherId || null,
          day_of_week: formData.dayOfWeek,
          start_time: formData.startTime,
          end_time: formData.endTime,
          room: formData.room || null,
          academic_year: settings?.academic_year || '2025-26'
        }]);

      if (error) throw error;

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Schedule New Class</h1>
          <p style={{ color: 'var(--text-muted)' }}>Add a recurring class to the weekly timetable.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
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
