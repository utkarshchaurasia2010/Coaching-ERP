"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, Mail, Lock, Phone, Briefcase, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";

import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function AddStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "teacher",
    department: "",
    contactNumber: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.fullName || !formData.email || !formData.password) {
        throw new Error("Please fill in all required fields.");
      }

      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      // 1. Create Auth User in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("Failed to create auth user.");

      // 2. Insert into public.users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: newUserId,
          full_name: formData.fullName,
          role: formData.role
        }]);

      if (userError) throw userError;

      // 3. If teacher, insert into teacher_profiles
      if (formData.role === 'teacher') {
        const { error: profileError } = await supabase
          .from('teacher_profiles')
          .insert([{
            id: newUserId,
            department: formData.department || null,
            contact_number: formData.contactNumber || null
          }]);

        if (profileError) throw profileError;
      }

      alert('Staff created successfully! Note: As you used the client signup, you have been logged in as the new user and will be redirected to the login page to log back in as Admin.');
      
      // Sign out the newly created user so the admin can log back in
      await supabase.auth.signOut();
      setIsDirty(false);
      router.replace('/');
      
    } catch (error: any) {
      console.error('Error creating staff:', error);
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Add New Staff</h1>
          <p style={{ color: 'var(--text-muted)' }}>Create an account for a new teacher or administrator.</p>
        </div>
      </div>

      <div className="alert alert-warning animate-in" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: 'var(--radius)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Shield size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem' }}>
          <strong>Admin Notice:</strong> Creating a new staff account from the dashboard will automatically log them in for verification. You will be signed out and redirected to the login page after successful creation.
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
                  placeholder="John Doe" 
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
                placeholder="Select role"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div className="input-group">
              <label>Email Address (Login ID) *</label>
              <div className="input-wrapper">
                <div className="input-icon"><Mail size={16} /></div>
                <input 
                  type="email" 
                  className="input" 
                  placeholder="email@institute.com" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="input-group">
              <label>Temporary Password *</label>
              <div className="input-wrapper">
                <div className="input-icon"><Lock size={16} /></div>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="Min 6 characters" 
                  required 
                  minLength={6}
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>
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
                    placeholder="e.g. Science, Mathematics" 
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
                    placeholder="+91..." 
                    value={formData.contactNumber} 
                    onChange={e => setFormData({...formData, contactNumber: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Create Staff Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
