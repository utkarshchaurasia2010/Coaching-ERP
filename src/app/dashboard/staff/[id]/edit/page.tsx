"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, Briefcase, Phone, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function EditStaffProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    role: "teacher",
    department: "",
    contactNumber: ""
  });

  useEffect(() => {
    const fetchStaffProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            full_name,
            role,
            teacher_profiles (
              department,
              contact_number
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        const staffData: any = data;
        
        setFormData({
          fullName: staffData.full_name || "",
          role: staffData.role || "teacher",
          department: staffData.teacher_profiles?.department || staffData.teacher_profiles?.[0]?.department || "",
          contactNumber: staffData.teacher_profiles?.contact_number || staffData.teacher_profiles?.[0]?.contact_number || ""
        });
      } catch (error) {
        console.error('Error fetching staff profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchStaffProfile();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Update public.users
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: formData.fullName,
          role: formData.role
        })
        .eq('id', id);

      if (userError) throw userError;

      // 2. Upsert teacher_profiles (if teacher or was teacher)
      const { error: profileError } = await supabase
        .from('teacher_profiles')
        .upsert({
          id: id,
          department: formData.role === 'teacher' ? formData.department : null,
          contact_number: formData.role === 'teacher' ? formData.contactNumber : null
        });

      if (profileError) throw profileError;

      alert('Staff profile updated successfully!');
      setIsDirty(false);
      router.replace(`/dashboard/staff/${id}`);
      
    } catch (error: any) {
      console.error('Error updating staff:', error);
      alert('Failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Edit Staff Profile</h1>
          <p style={{ color: 'var(--text-muted)' }}>Update profile details and role.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Full Name *</label>
              <div className="input-wrapper">
                <div className="input-icon"><User size={16} /></div>
                <input 
                  type="text" 
                  className="input" 
                  required 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>System Role *</label>
              <CustomSelect
                icon={<Shield size={16} />}
                options={[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'admin', label: 'Administrator' }
                ]}
                value={formData.role}
                onChange={(val) => setFormData({...formData, role: val})}
              />
            </div>
          </div>

          {formData.role === 'teacher' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div className="input-group">
                <label>Department</label>
                <div className="input-wrapper">
                  <div className="input-icon"><Briefcase size={16} /></div>
                  <input 
                    type="text" 
                    className="input" 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value})} 
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Contact Number</label>
                <div className="input-wrapper">
                  <div className="input-icon"><Phone size={16} /></div>
                  <input 
                    type="tel" 
                    className="input" 
                    value={formData.contactNumber} 
                    onChange={e => setFormData({...formData, contactNumber: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
