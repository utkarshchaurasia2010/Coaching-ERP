"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, BookOpen, Calendar, AlignLeft, CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";

import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function NewBatchPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active",
    maxCapacity: "",
    selectedSubjects: [] as string[]
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name');
    if (data) setAvailableSubjects(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!formData.name) throw new Error("Batch Name is required.");
      
      // 1. Insert Batch
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .insert({
          name: formData.name,
          description: formData.description || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: formData.status,
          max_capacity: formData.maxCapacity ? parseInt(formData.maxCapacity) : null,
          academic_year: settings?.academic_year || '2025-26'
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // 2. Insert Batch Subjects (if any)
      if (formData.selectedSubjects.length > 0 && batchData) {
        const batchSubjectsToInsert = formData.selectedSubjects.map(subId => ({
          batch_id: batchData.id,
          subject_id: subId
        }));
        
        const { error: subjectError } = await supabase
          .from('batch_subjects')
          .insert(batchSubjectsToInsert);
          
        if (subjectError) throw subjectError;
      }

      setSuccess(true);
      setIsDirty(false);
      router.replace('/dashboard/batches');

    } catch (err: any) {
      console.error("Batch creation error:", err);
      setError(err.message || err.details || "Failed to create batch.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedSubjects.includes(subjectId);
      if (isSelected) {
        return { ...prev, selectedSubjects: prev.selectedSubjects.filter(id => id !== subjectId) };
      } else {
        return { ...prev, selectedSubjects: [...prev.selectedSubjects, subjectId] };
      }
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="flex-between animate-in" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => attemptBack()}
            className="btn btn-outline" 
            style={{ padding: '0.5rem', borderRadius: '50%' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>Create New Batch</h1>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Set up a new class schedule and assign subjects.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <Loader2 size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', border: '1px solid rgba(5,150,105,0.2)' }}>
          <CheckCircle2 size={18} />
          Batch created successfully! Redirecting...
        </div>
      )}

      <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* SECTION 1: Batch Info */}
        <div className="card animate-in delay-100" style={{ padding: '2rem', position: 'relative', zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
              <BookOpen size={20} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Batch Details</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Batch Name *</label>
              <div className="input-wrapper">
                <div className="input-icon"><BookOpen size={16} /></div>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. JEE Main 2027 Morning Batch"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Maximum Capacity</label>
              <div className="input-wrapper">
                <div className="input-icon"><Users size={16} /></div>
                <input 
                  type="number" 
                  min="1"
                  className="input" 
                  placeholder="e.g. 50"
                  value={formData.maxCapacity}
                  onChange={e => setFormData({...formData, maxCapacity: e.target.value})}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Description</label>
              <div className="input-wrapper">
                <div className="input-icon" style={{ top: '1rem', transform: 'none' }}><AlignLeft size={16} /></div>
                <textarea 
                  className="input" 
                  placeholder="Optional details about this batch..."
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ paddingTop: '0.875rem', paddingLeft: '2.5rem', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Timeline */}
        <div className="card animate-in delay-200" style={{ padding: '2rem', position: 'relative', zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '0.5rem', borderRadius: '8px' }}>
              <Calendar size={20} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Timeline & Status</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Start Date</label>
              <div className="input-wrapper">
                <input 
                  type="date" 
                  className="input" 
                  value={formData.start_date}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                  style={{ paddingLeft: '1.25rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label>End Date</label>
              <div className="input-wrapper">
                <input 
                  type="date" 
                  className="input" 
                  value={formData.end_date}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                  style={{ paddingLeft: '1.25rem' }}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Status</label>
              <CustomSelect
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
                value={formData.status}
                onChange={(val) => setFormData({...formData, status: val})}
                placeholder="Select Status"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Subjects Setup */}
        <div className="card animate-in delay-300" style={{ padding: '2rem', position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.5rem', borderRadius: '8px' }}>
              <BookOpen size={20} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Assign Subjects</h2>
          </div>

          <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>Select the subjects that will be taught in this batch.</p>

          {availableSubjects.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--background)', borderRadius: '8px' }}>
              No subjects available in the database yet. You can assign them later.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
              {availableSubjects.map(subject => {
                const isSelected = formData.selectedSubjects.includes(subject.id);
                return (
                  <div 
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'var(--surface-solid)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: '18px', height: '18px', borderRadius: '4px', 
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--text-light)'}`,
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <CheckCircle2 size={12} color="white" />}
                    </div>
                    <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                      {subject.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-between animate-in delay-300" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {loading ? "Creating..." : "Save Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
