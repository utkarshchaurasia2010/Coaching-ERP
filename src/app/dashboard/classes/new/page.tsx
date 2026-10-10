"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, School, DoorOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function NewClassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);

  const prefilledClassName = searchParams.get('className') || "";

  const [formData, setFormData] = useState({
    className: prefilledClassName,
    section: "A",
    stream: "General",
    roomNo: "",
    maxCapacity: "40"
  });

  useEffect(() => {
    if (prefilledClassName) {
      setFormData(prev => ({ ...prev, className: prefilledClassName }));
    }
  }, [prefilledClassName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.className) return alert("Please enter class name (e.g. Class 10)");
    setLoading(true);

    try {
      const year = settings?.academic_year || '2026-27';
      const cleanSection = formData.section.trim().toUpperCase() || 'A';
      const fullName = `${formData.className} - ${cleanSection}`;

      // Insert directly into unified batches table
      const { error } = await supabase
        .from('batches')
        .insert([{
          name: fullName,
          class_name: formData.className,
          section: cleanSection,
          stream: formData.stream,
          room_no: formData.roomNo || null,
          max_capacity: parseInt(formData.maxCapacity) || 40,
          status: 'active',
          academic_year: year
        }]);

      if (error) throw error;

      alert("Class section created successfully!");
      router.push("/dashboard/classes");

    } catch (err: any) {
      console.error(err);
      alert("Failed to create class section: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
            Add Class & Section
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Define school grade level, division section, and capacity.</p>
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
                placeholder="e.g. Class 10, Class 6, or Kindergarten" 
                value={formData.className}
                onChange={e => setFormData({ ...formData, className: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Section / Division *</label>
              <div className="input-wrapper">
                <div className="input-icon"><DoorOpen size={16} /></div>
                <input 
                  type="text" 
                  className="input" 
                  required 
                  placeholder="e.g. A, B, or Rose" 
                  value={formData.section}
                  onChange={e => setFormData({ ...formData, section: e.target.value })}
                />
              </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Room / Wing Number</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Room 204 or Block B" 
                value={formData.roomNo}
                onChange={e => setFormData({ ...formData, roomNo: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label>Max Student Capacity</label>
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
              Save Class Section
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
