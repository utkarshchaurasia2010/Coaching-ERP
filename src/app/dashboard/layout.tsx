"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  Settings, 
  LogOut,
  Bell,
  Menu,
  X,
  BookOpen,
  IndianRupee,
  Award,
  Megaphone
} from "lucide-react";
import { SettingsProvider, useSettings } from "@/context/SettingsContext";
import { FormDirtyProvider, useFormDirty } from "@/context/FormDirtyContext";
import { supabase } from "@/lib/supabase";

function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { settings, setActiveAcademicYear } = useSettings();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [userRole, setUserRole] = useState("admin");
  const [userId, setUserId] = useState("");
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setUserId(session.user.id);

      // Fetch user profile from public.users table
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        setAdminName(userData.full_name || session.user.email || 'Admin');
        setUserRole(userData.role || 'admin');
      } else {
        setAdminName(session.user.email?.split('@')[0] || 'Admin');
        setUserRole('admin');
      }
      setAuthLoading(false);
    };

    checkAuth();
    
    if (settings?.academic_year) {
      const fetchNotifications = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('academic_year', settings.academic_year)
          .order('created_at', { ascending: false })
          .limit(5);
        if (data) setNotifications(data);
      };
      fetchNotifications();
    }
  }, [settings?.academic_year]);

  const handleSaveName = async () => {
    if (!tempName.trim() || tempName === adminName) {
      setIsEditingName(false);
      return;
    }
    
    setAdminName(tempName);
    setIsEditingName(false);
    
    if (userId) {
      const { error } = await supabase.from('users').upsert({ 
        id: userId, 
        full_name: tempName,
        role: userRole
      });
      if (error) console.error("Error saving name to DB:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    
    // Optimistic UI update
    setNotifications(notifications.map(n => ({...n, is_read: true})));
    
    // In background
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    }
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (authLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 35 }} 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <SidebarHeader onMenuClick={() => setSidebarOpen(false)} />
        
        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/dashboard" active={pathname === '/dashboard'} onClick={() => setSidebarOpen(false)} />
          <SidebarItem icon={<Users size={20} />} label="Students" href="/dashboard/students" active={pathname.startsWith('/dashboard/students')} onClick={() => setSidebarOpen(false)} />
          <SidebarItem icon={<BookOpen size={20} />} label="Batches" href="/dashboard/batches" active={pathname.startsWith('/dashboard/batches')} onClick={() => setSidebarOpen(false)} />
          <SidebarItem icon={<Award size={20} />} label="Academics" href="/dashboard/academics/exams" active={pathname.startsWith('/dashboard/academics')} onClick={() => setSidebarOpen(false)} />
          <SidebarItem icon={<Calendar size={20} />} label="Schedule" href="/dashboard/schedule" active={pathname.startsWith('/dashboard/schedule')} onClick={() => setSidebarOpen(false)} />
          <SidebarItem icon={<Megaphone size={20} />} label="Notices" href="/dashboard/notices" active={pathname.startsWith('/dashboard/notices')} onClick={() => setSidebarOpen(false)} />
          
          {(userRole === 'admin' || userRole === 'teacher') && (
            <SidebarItem icon={<IndianRupee size={20} />} label="Financials" href="/dashboard/financials" active={pathname.startsWith('/dashboard/financials')} onClick={() => setSidebarOpen(false)} />
          )}

          {userRole === 'admin' && (
            <>
              <SidebarItem icon={<GraduationCap size={20} />} label="Staff" href="/dashboard/staff" active={pathname.startsWith('/dashboard/staff')} onClick={() => setSidebarOpen(false)} />
              <SidebarItem icon={<Settings size={20} />} label="Settings" href="/dashboard/settings" active={pathname.startsWith('/dashboard/settings')} onClick={() => setSidebarOpen(false)} />
            </>
          )}
        </nav>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <a href="#" onClick={handleSignOut} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            color: 'var(--danger)', 
            padding: '0.5rem',
            textDecoration: 'none',
            fontWeight: 500
          }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div style={{ fontWeight: 500 }}>
              Welcome back, {adminName}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.5rem', borderRadius: '50%', border: 'none', background: 'rgba(241, 245, 249, 0.5)', position: 'relative' }}
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markAsRead();
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{ 
                    position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white', 
                    fontSize: '0.65rem', fontWeight: 700, width: '16px', height: '16px', 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{ 
                  position: 'absolute', top: '120%', right: 0, width: '300px', 
                  background: 'var(--surface-solid)', border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 50,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                    Notifications
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)' }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem' }}>
                {adminName.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {isEditingName ? (
                  <input
                    type="text"
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 2px', border: '1px solid var(--primary)', borderRadius: '3px', outline: 'none', background: 'var(--surface-solid)', color: 'var(--foreground)' }}
                  />
                ) : (
                  <span 
                    style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => {
                      setTempName(adminName);
                      setIsEditingName(true);
                    }}
                    title="Click to edit name"
                  >
                    {adminName}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {userRole === 'admin' ? 'Administrator' : 'Teacher'}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="page-content animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <FormDirtyProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </FormDirtyProvider>
    </SettingsProvider>
  );
}

function SidebarItem({ icon, label, href, active = false, onClick }: { icon: React.ReactNode, label: string, href: string, active?: boolean, onClick?: () => void }) {
  const { attemptNavigation } = useFormDirty();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (active) {
      if (onClick) onClick();
      return;
    }
    attemptNavigation(href);
    if (onClick) onClick();
  };

  return (
    <a href={href} onClick={handleClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius)',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      background: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
      textDecoration: 'none',
      fontWeight: active ? 500 : 400,
      transition: 'all 0.2s'
    }}>
      {icon}
      <span>{label}</span>
    </a>
  );
}

function SidebarHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { settings } = useSettings();
  
  return (
    <div style={{ 
      height: 'var(--header-height)', 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            {settings?.name ? settings.name.charAt(0) : 'I'}
          </div>
        )}
        <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--foreground)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {settings?.name || "Institute ERP"}
        </div>
      </div>
      <button className="menu-toggle" onClick={onMenuClick} style={{ margin: 0, padding: '0.25rem' }}>
        <X size={24} />
      </button>
    </div>
  );
}
