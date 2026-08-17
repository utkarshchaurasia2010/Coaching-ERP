"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, EyeOff, Eye, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const { settings } = useSettings();
  const [role, setRole] = useState<"staff" | "parent">("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    code: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === "staff") {
        if (!formData.username || !formData.password) {
          throw new Error("Please enter all required credentials.");
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.username,
          password: formData.password,
        });

        if (error) throw error;

        // Removed the check that forced teachers to /staff
        // Both admins and teachers now go to the main dashboard
        
        router.push("/dashboard");
      } else {
        if (!formData.username) {
          throw new Error("Please enter your registered mobile number.");
        }

        // Parent login using mobile number
        const { data, error } = await supabase
          .from('students')
          .select('id, full_name')
          .or(`contact_number.eq.${formData.username},parent_contact.eq.${formData.username}`)
          .limit(1);

        if (error || !data || data.length === 0) {
          throw new Error("No student found with this registered mobile number.");
        }

        // Simulate session by storing student ID
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('parent_student_id', data[0].id);
          sessionStorage.setItem('parent_student_name', data[0].full_name);
        }
        
        router.push("/parent");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSwitch = (newRole: "staff" | "parent") => {
    setRole(newRole);
    setError(null);
    setFormData({ username: "", password: "", code: "" });
  };

  return (
    <div className="animate-in" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem', 
      background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' 
    }}>
      
      <div className="animate-in delay-100" style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'contain', marginBottom: '1rem' }} />
        ) : (
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '2rem', marginBottom: '1rem' }}>
            {settings?.name ? settings.name.charAt(0) : 'I'}
          </div>
        )}
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
          {settings?.name || "Institute ERP"}
        </h1>
        <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {settings?.tagline || "Coaching Center & Finance OS"}
        </p>
      </div>

      <div className="card animate-in delay-200" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
        
        <div className="tab-switcher">
          <button 
            type="button"
            className={`tab-btn ${role === "staff" ? "active" : ""}`}
            onClick={() => handleRoleSwitch("staff")}
          >
            <ShieldCheck size={18} />
            Staff Login
          </button>
          <button 
            type="button"
            className={`tab-btn ${role === "parent" ? "active" : ""}`}
            onClick={() => handleRoleSwitch("parent")}
          >
            <User size={18} />
            Parent Portal
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
            {role === "staff" ? "Staff & Administration Sign In" : "Parent Portal Sign In"}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {role === "staff" ? "Access your dashboard securely with your assigned staff credentials." : "Enter your registered mobile number to access student records."}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger animate-in">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="input-group">
            <label htmlFor="username">{role === "staff" ? "Staff Username / Email" : "Registered Mobile Number"}</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <User size={18} />
              </div>
              <input 
                type={role === "staff" ? "email" : "tel"} 
                id="username" 
                className="input" 
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={role === "staff" ? "e.g. admin@school.com" : "e.g. +91 9876543210"}
                required
              />
            </div>
          </div>
          
          {role === "staff" && (
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  className="input" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required={role === "staff"}
                />
                <div 
                  className="input-icon-right" 
                  onClick={() => setShowPassword(!showPassword)}
                  role="button"
                  tabIndex={0}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </div>
              </div>
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', position: 'relative', marginTop: role === 'parent' ? '1.5rem' : '0' }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              `Access ${role === "staff" ? "Staff Dashboard" : "Parent Portal"}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SettingsProvider>
      <LoginContent />
    </SettingsProvider>
  );
}
