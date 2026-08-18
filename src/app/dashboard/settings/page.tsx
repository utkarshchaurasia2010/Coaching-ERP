"use client";

import { useState, useEffect } from "react";
import { Save, Upload, Building2, MapPin, Phone, Globe, Loader2, CheckCircle2, Plus, X, Lock, Eye, EyeOff } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";

export default function SettingsPage() {
  const { settings, loading: contextLoading, refreshSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    email: "",
    phone: "",
    address: "",
    currency: "INR",
    academic_year: "2025-26",
    available_academic_years: [] as string[]
  });
  
  const [newYearInput, setNewYearInput] = useState("");

  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState("");
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || "",
        tagline: settings.tagline || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        currency: settings.currency || "INR",
        academic_year: settings.academic_year || "2025-26",
        available_academic_years: settings.available_academic_years || ["2024-25", "2025-26", "2026-27"]
      });
      setLogoPreview(settings.logo_url || null);
    }
  }, [settings]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name');
        
        if (error) throw error;
        if (data) setSubjects(data);
      } catch (err) {
        console.error("Error fetching subjects:", err);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleAddSubject = async () => {
    if (!newSubjectInput.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ name: newSubjectInput.trim() }])
        .select()
        .single();
        
      if (error) throw error;
      
      setSubjects([...subjects, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSubjectInput("");
      setSuccessMsg("Subject added successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add subject.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete subject. It might be in use.");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    
    setPasswordLoading(true);
    setErrorMsg("");
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setSuccessMsg("Admin password updated successfully!");
      setNewPassword("");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (section: string, overrideData?: any) => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      let finalLogoUrl = settings?.logo_url || null;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('institute-assets')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw new Error("Failed to upload logo.");

        const { data: publicUrlData } = supabase.storage
          .from('institute-assets')
          .getPublicUrl(fileName);
          
        finalLogoUrl = publicUrlData.publicUrl;
      }

      const dataToSave = overrideData || formData;
      const { error } = await supabase
        .from('institute_settings')
        .update({
          name: dataToSave.name,
          tagline: dataToSave.tagline,
          email: dataToSave.email,
          phone: dataToSave.phone,
          address: dataToSave.address,
          currency: dataToSave.currency,
          academic_year: dataToSave.academic_year,
          available_academic_years: dataToSave.available_academic_years,
          logo_url: finalLogoUrl
        })
        .eq('id', settings?.id || 'default');

      if (error) throw error;

      setSuccessMsg(`${section} saved successfully!`);
      await refreshSettings();
      setLogoFile(null);
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin text-muted" size={32} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div className="animate-in">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>Institute Settings</h1>
        <p className="text-muted" style={{ fontSize: '1.0625rem' }}>Manage your coaching center's identity, credentials, and preferences.</p>
      </div>

      {successMsg && (
        <div className="alert animate-in" style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', border: '1px solid rgba(5,150,105,0.2)' }}>
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div className="alert alert-danger animate-in">
          <Loader2 size={18} /> {errorMsg}
        </div>
      )}

      <div className="grid-layout animate-in delay-100">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} className="text-muted" />
              Brand & Identity
            </h2>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: 'var(--radius)', 
                border: '2px dashed var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: logoPreview ? 'transparent' : 'rgba(248, 250, 252, 0.5)',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <Upload size={24} style={{ color: 'var(--text-light)', marginBottom: '0.5rem' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Upload Logo</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Upload your institute's logo. This will be displayed on the login page, dashboard header, and generated fee receipts. Recommended size: 256x256px (PNG/JPG).
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', position: 'relative' }}>
                    <Upload size={16} /> Choose File
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </button>
                  {logoPreview && (
                    <button className="btn btn-outline" onClick={() => { setLogoPreview(null); setLogoFile(null); }} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={(e) => { e.preventDefault(); handleSave('Brand Identity'); }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Coaching Institute Name</label>
                <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. St. G.N.G. School" />
              </div>
              
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Tagline / Subtitle</label>
                <input type="text" className="input" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} placeholder="e.g. Shaping the future" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Identity
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)' }}>
              Contact Information
            </h2>
            <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} onSubmit={(e) => { e.preventDefault(); handleSave('Contact Info'); }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Primary Email</label>
                <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@example.com" />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Phone Number</label>
                <input type="tel" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 9876543210" />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label>Institute Address</label>
                <textarea className="input" rows={3} style={{ resize: 'vertical' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="123 Education Lane..."></textarea>
              </div>
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Contact Info
                </button>
              </div>
            </form>
          </div>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>Financial Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Default Currency</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Used for fee tracking</div>
                </div>
                <div style={{ width: '120px' }}>
                  <CustomSelect 
                    options={[
                      { value: "INR", label: "₹ INR" },
                      { value: "USD", label: "$ USD" }
                    ]}
                    value={formData.currency} 
                    onChange={v => {
                      const newFormData = {...formData, currency: v};
                      setFormData(newFormData);
                      handleSave('Preferences', newFormData);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
              
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>Academic Sessions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Active Academic Year</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Currently viewing data for this session</div>
                </div>
                <div style={{ width: '140px' }}>
                  <CustomSelect 
                    options={formData.available_academic_years.map(yr => ({ value: yr, label: yr }))}
                    value={formData.academic_year} 
                    onChange={v => {
                      const newFormData = {...formData, academic_year: v};
                      setFormData(newFormData);
                      handleSave('Preferences', newFormData);
                    }}
                  />
                </div>
              </div>
              
              <div style={{ background: 'var(--surface-solid)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manage Academic Years</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {formData.available_academic_years.map(yr => (
                    <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'white', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
                      {yr}
                      {formData.available_academic_years.length > 1 && (
                        <button 
                          onClick={() => {
                            const newYears = formData.available_academic_years.filter(y => y !== yr);
                            const newActive = formData.academic_year === yr ? newYears[0] : formData.academic_year;
                            const newFormData = {...formData, available_academic_years: newYears, academic_year: newActive};
                            setFormData(newFormData);
                            handleSave('Preferences', newFormData);
                          }}
                          style={{ color: 'var(--text-muted)', marginLeft: '0.25rem', display: 'flex', alignItems: 'center' }}
                          onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input" 
                    style={{ padding: '0.5rem', flex: 1, fontSize: '0.875rem' }} 
                    placeholder="e.g. 2027-28" 
                    value={newYearInput}
                    onChange={e => setNewYearInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newYearInput.trim() && !formData.available_academic_years.includes(newYearInput.trim())) {
                          const newFormData = {
                            ...formData, 
                            available_academic_years: [...formData.available_academic_years, newYearInput.trim()]
                          };
                          setFormData(newFormData);
                          setNewYearInput("");
                          handleSave('Preferences', newFormData);
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    onClick={() => {
                      if (newYearInput.trim() && !formData.available_academic_years.includes(newYearInput.trim())) {
                        const newFormData = {
                          ...formData, 
                          available_academic_years: [...formData.available_academic_years, newYearInput.trim()]
                        };
                        setFormData(newFormData);
                        setNewYearInput("");
                        handleSave('Preferences', newFormData);
                      }
                    }}
                  >
                    Add Year
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} className="text-muted" />
              Admin Security
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-muted" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>New Password</label>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input" 
                    style={{ width: '100%', paddingRight: '2.5rem' }} 
                    placeholder="Enter new password (min 6 characters)" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleChangePassword();
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: 'fit-content' }}
                onClick={handleChangePassword}
                disabled={!newPassword || newPassword.length < 6 || passwordLoading}
              >
                {passwordLoading ? 'Updating...' : 'Update Admin Password'}
              </button>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>Manage Subjects</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                className="input" 
                style={{ flex: 1 }} 
                placeholder="e.g. Computer Science" 
                value={newSubjectInput}
                onChange={e => setNewSubjectInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleAddSubject}
              >
                Add Subject
              </button>
            </div>

            {subjectsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 className="animate-spin text-muted" size={20} /></div>
            ) : subjects.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
                No subjects found in database. Run the SQL query to insert defaults!
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {subjects.map(subject => (
                  <div key={subject.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'white', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 500 }}>
                    {subject.name}
                    <button 
                      onClick={() => handleDeleteSubject(subject.id)}
                      style={{ color: 'var(--text-muted)', marginLeft: '0.25rem', display: 'flex', alignItems: 'center' }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
