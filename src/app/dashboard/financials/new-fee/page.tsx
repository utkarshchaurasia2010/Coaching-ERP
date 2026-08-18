"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, FileText, Calendar, IndianRupee } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useSettings } from "@/context/SettingsContext";

export default function NewFeePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    studentId: "",
    title: "",
    amount: "",
    dueDate: ""
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (userData?.role !== 'admin') {
        alert('Access denied. Only administrators can assign new fees.');
        router.replace('/dashboard/financials');
      }
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (settings?.academic_year) {
      const fetchStudents = async () => {
        const { data } = await supabase
          .from('students')
          .select('id, full_name, current_class')
          .eq('academic_year', settings.academic_year)
          .eq('enrollment_status', 'active');
        
        if (data) setStudents(data);
      };
      fetchStudents();
    }
  }, [settings?.academic_year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.studentId || !formData.title || !formData.amount) {
        throw new Error("Please fill in all required fields.");
      }

      const { error } = await supabase
        .from('fees')
        .insert([{ 
          student_id: formData.studentId,
          title: formData.title,
          total_amount: parseFloat(formData.amount),
          due_date: formData.dueDate || null,
          status: 'pending',
          academic_year: settings?.academic_year || '2025-26'
        }]);

      if (error) throw error;

      alert('Fee assigned successfully!');
      router.replace('/dashboard/financials');
      
    } catch (error: any) {
      console.error('Error assigning fee:', error);
      alert('Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Assign New Fee</h1>
          <p style={{ color: 'var(--text-muted)' }}>Create a new fee record for a student.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label>Select Student *</label>
            <CustomSelect
              icon={<User size={16} />}
              options={students.map(s => ({ value: s.id, label: `${s.full_name} (${s.current_class || 'No Class'})` }))}
              value={formData.studentId}
              onChange={(val) => setFormData({...formData, studentId: val})}
              placeholder="Select a student"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Assign Fee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
