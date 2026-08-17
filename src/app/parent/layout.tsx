"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";

function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { settings } = useSettings();
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for simulated session
    const studentId = sessionStorage.getItem('parent_student_id');
    const name = sessionStorage.getItem('parent_student_name');

    if (!studentId) {
      router.push('/');
      return;
    }

    setStudentName(name || "Student");
    setLoading(false);
  }, [router]);

  const handleSignOut = () => {
    sessionStorage.removeItem('parent_student_id');
    sessionStorage.removeItem('parent_student_name');
    router.push('/');
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Mobile-friendly Top Navigation */}
      <header style={{ 
        background: 'var(--surface-solid)', 
        borderBottom: '1px solid var(--border)', 
        padding: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {settings?.name ? settings.name.charAt(0) : 'I'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--foreground)' }}>Parent Portal</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{settings?.name || "Institute"}</div>
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="btn btn-outline"
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', 
          color: 'white', 
          padding: '1.5rem', 
          borderRadius: '1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.3), 0 8px 10px -6px rgba(79, 70, 229, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative shapes */}
          <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)' }}></div>
          <div style={{ position: 'absolute', bottom: '-20%', right: '15%', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)' }}></div>
          
          <div style={{ 
            width: '48px', height: '48px', 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.2)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.3)',
            zIndex: 1
          }}>
            <User size={24} />
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>Parent Portal</div>
            <div style={{ fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.01em' }}>{studentName}</div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

export default function ParentLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ParentLayout>{children}</ParentLayout>
    </SettingsProvider>
  );
}
