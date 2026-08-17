"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, FileText, Calendar, IndianRupee, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";
import { use } from "react";
import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function EditFeePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const resolvedParams = use(params);
  const feeId = resolvedParams.id;
  
  const [formData, setFormData] = useState({
    studentId: "",
    title: "",
    amount: "",
    dueDate: "",
    status: "pending"
  });

  useEffect(() => {
    if (settings?.academic_year) {
      loadData();
    }
  }, [settings?.academic_year]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, full_name, current_class')
        .eq('academic_year', settings!.academic_year)
        .eq('enrollment_status', 'active');
      
      if (studentsData) setStudents(studentsData);

      // Fetch fee details
      const { data: feeData, error } = await supabase
        .from('fees')
        .select('*')
        .eq('id', feeId)
        .single();

      if (error) throw error;

      setFormData({
        studentId: feeData.student_id || "",
        title: feeData.title || "",
        amount: feeData.total_amount ? feeData.total_amount.toString() : "",
        dueDate: feeData.due_date ? new Date(feeData.due_date).toISOString().split('T')[0] : "",
        status: feeData.status || "pending"
      });
    } catch (err) {
      console.error("Error loading fee:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!formData.studentId || !formData.title || !formData.amount) {
        throw new Error("Please fill in all required fields.");
      }

      const { error } = await supabase
        .from('fees')
        .update({ 
          student_id: formData.studentId,
          title: formData.title,
          total_amount: parseFloat(formData.amount),
          due_date: formData.dueDate || null,
          status: formData.status
        })
        .eq('id', feeId);

      if (error) throw error;

      alert('Fee updated successfully!');
      setIsDirty(false);
      router.replace('/dashboard/financials');
      
    } catch (error: any) {
      console.error('Error updating fee:', error);
      alert('Failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this fee? This action cannot be undone.")) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('fees').delete().eq('id', feeId);
      if (error) throw error;
      alert("Fee deleted successfully!");
      setIsDirty(false); router.push('/dashboard/financials');
    } catch (err: any) {
      console.error(err);
      alert("Error deleting fee: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-muted" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => attemptBack()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Edit Fee</h1>
          <p style={{ color: 'var(--text-muted)' }}>Update details for this assigned fee.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label>Select Student *</label>
            <CustomSelect
              icon={<User size={16} />}
              options={students.map(s => ({ value: s.id, label: `${s.full_name} (${s.current_class || 'No Class'})` }))}
              value={formData.studentId}
              onChange={(val) => setFormData({...formData, studentId: val})}
              placeholder="Select a student"
              disabled={true}
            />
          </div>

          <div className="input-group">
            <label>Fee Title / Description *</label>
            <div className="input-wrapper">
              <div className="input-icon"><FileText size={16} /></div>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Tuition Fee - Q1" 
                required 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
              />
            </div>
          </div>

          <div className="input-group">
            <label>Total Amount Due *</label>
            <div className="input-wrapper">
              <div className="input-icon"><IndianRupee size={16} /></div>
              <input 
                type="number" 
                min="0"
                step="0.01"
                className="input" 
                placeholder="e.g. 5000" 
                required 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="input-group">
            <label>Due Date</label>
            <div className="input-wrapper">
              <input 
                type="date" 
                className="input" 
                style={{ paddingLeft: '1.25rem' }}
                value={formData.dueDate} 
                onChange={e => setFormData({...formData, dueDate: e.target.value})} 
              />
            </div>
          </div>

          <div className="input-group">
            <label>Status</label>
            <CustomSelect
              options={[
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "paid", label: "Paid" }
              ]}
              value={formData.status}
              onChange={(v) => setFormData({...formData, status: v})}
              icon={<CheckCircle2 size={16} />}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn" 
              onClick={handleDelete}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <Trash2 size={18} />
              Delete Fee
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
