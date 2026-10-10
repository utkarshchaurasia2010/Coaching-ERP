"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, School, DoorOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function NewClassPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    numericGrade: "1",
    stream: "General",
    sections: "A, B",
    roomNo: "",
    maxCapacity: "40"
  });

  useEffect(() => {
    const fetchTeachers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'teacher');
      if (data) setTeachers(data);
    };
    fetchTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("Please enter class name");
    setLoading(true);

    try {
      const year = settings?.academic_year || '2026-27';

      // 1. Insert into classes table
      let classId: string | null = null;
      const { data: classInsert, error: classError } = await supabase
        .from('classes')
        .insert([{
          name: formData.name,
          numeric_grade: parseInt(formData.numericGrade) || 1,
          stream: formData.stream,
          academic_year: year
        }])
        .select()
        .single();

      if (classError) {
        // Fallback: If classes table not yet migrated, save as a batch for backward safety
        const { data: batchInsert, error: batchError } = await supabase
          .from('batches')
          .insert([{
            name: formData.name,
            max_capacity: parseInt(formData.maxCapacity) || 40,
            academic_year: year
          }])
          .select()
          .single();
        if (batchError) throw batchError;
        classId = batchInsert.id;
      } else {
        classId = classInsert.id;
      }

      // 2. Insert sections if table exists
      if (classId) {
        const sectionNames = formData.sections
          .split(',')
          .map(s => s.trim().toUpperCase())
          .filter(Boolean);

        if (sectionNames.length > 0) {
          const sectionRows = sectionNames.map(sName => ({
            class_id: classId,
            name: sName,
            room_no: formData.roomNo || null,
            max_capacity: parseInt(formData.maxCapacity) || 40,
            academic_year: year
          }));

          await supabase.from('sections').insert(sectionRows);
        }
      }

      alert("Class and sections created successfully!");
      router.push("/dashboard/classes");

    } catch (err: any) {
      console.error(err);
      alert("Failed to create class: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
            Create New Class & Sections
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Define school grade level, streams, and division sections.</p>
        </div>
      </div>

      <div className="card animate-in delay-100">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
          
          <div className="input-group">
            <label>Class / Grade Name *</label>
            <div className="input-wrapper">
              <div className="input-icon"><School size={16} /></div>
              <input 
                type="text" 
                className="input" 
                required 
                placeholder="e.g. Class 10 or Kindergarten" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Numeric Grade (Sorting Order)</label>
              <select 
                className="input" 
                value={formData.numericGrade} 
                onChange={e => setFormData({ ...formData, numericGrade: e.target.value })}
              >
                <option value="0">Kindergarten / Nursery (0)</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Grade {i + 1}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Stream / Wing</label>
              <select 
                className="input" 
                value={formData.stream} 
                onChange={e => setFormData({ ...formData, stream: e.target.value })}
              >
                <option value="General">General (Grades 1–10)</option>
                <option value="Science">Science (PCM / PCB)</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts / Humanities</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Division Sections (Comma separated)</label>
            <div className="input-wrapper">
              <div className="input-icon"><DoorOpen size={16} /></div>
              <input 
                type="text" 
                className="input" 
                required 
                placeholder="e.g. A, B, C or Blue, Green" 
                value={formData.sections}
                onChange={e => setFormData({ ...formData, sections: e.target.value })}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Creates individual sections under this class automatically.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Default Room / Wing Number</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Room 204 or Block B" 
                value={formData.roomNo}
                onChange={e => setFormData({ ...formData, roomNo: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Max Students Per Section</label>
              <input 
                type="number" 
                className="input" 
                min="1"
                value={formData.maxCapacity}
                onChange={e => setFormData({ ...formData, maxCapacity: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Class & Sections
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
