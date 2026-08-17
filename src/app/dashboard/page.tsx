"use client";

import { useState, useEffect } from "react";
import { Users, GraduationCap, Calendar, TrendingUp, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function DashboardPage() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBatches: 0,
    totalSubjects: 0,
    revenue: 0
  });
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!settings?.academic_year) return;
      try {
        setLoading(true);
        // Fetch counts
        // Get today's day string for schedules
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayStr = DAYS[new Date().getDay()];

        const [
          { count: studentsCount },
          { count: batchesCount },
          { count: subjectsCount },
          { data: recentData },
          { data: transactionsData },
          { data: scheduleData }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('academic_year', settings.academic_year),
          supabase.from('batches').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('academic_year', settings.academic_year),
          supabase.from('subjects').select('*', { count: 'exact', head: true }), // Subjects are usually global
          supabase.from('enrollments')
            .select(`
              id,
              enrollment_date,
              students!inner(full_name, enrollment_status, academic_year),
              batches!inner(name, academic_year)
            `)
            .eq('students.academic_year', settings.academic_year)
            .order('enrollment_date', { ascending: false })
            .limit(5),
          supabase.from('transactions').select('amount_paid').eq('academic_year', settings.academic_year),
          supabase.from('schedules').select('day_of_week, start_time, end_time, subjects(name), batches(name)').eq('academic_year', settings.academic_year)
        ]);

        const totalRevenue = (transactionsData || []).reduce((sum, t) => sum + Number(t.amount_paid), 0);

        setStats({
          totalStudents: studentsCount || 0,
          activeBatches: batchesCount || 0,
          totalSubjects: subjectsCount || 0,
          revenue: totalRevenue
        });

        if (recentData) setRecentEnrollments(recentData);
        if (scheduleData) {
          const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const currentDayIdx = new Date().getDay();
          const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });
          
          const sorted = [...scheduleData].sort((a, b) => {
            const dayA = daysOfWeek.indexOf(a.day_of_week);
            const dayB = daysOfWeek.indexOf(b.day_of_week);
            let daysUntilA = dayA - currentDayIdx;
            if (daysUntilA < 0 || (daysUntilA === 0 && a.start_time < currentTime)) daysUntilA += 7;
            let daysUntilB = dayB - currentDayIdx;
            if (daysUntilB < 0 || (daysUntilB === 0 && b.start_time < currentTime)) daysUntilB += 7;
            
            if (daysUntilA !== daysUntilB) return daysUntilA - daysUntilB;
            return a.start_time.localeCompare(b.start_time);
          });
          
          setUpcomingClasses(sorted.slice(0, 5));
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    
    fetchDashboardData();
  }, [settings?.academic_year]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin text-muted" size={32} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <div className="animate-in">
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>Dashboard Overview</h1>
        <p className="text-muted" style={{ fontSize: '1.0625rem' }}>Here's what's happening at your institute today.</p>
      </div>

      <div className="grid-cards animate-in delay-100">
        <StatCard title="Total Students" value={stats.totalStudents.toString()} icon={<Users size={24} />} trend="Live Data" />
        <StatCard title="Active Batches" value={stats.activeBatches.toString()} icon={<GraduationCap size={24} />} trend="Live Data" />
        <StatCard title="Total Subjects" value={stats.totalSubjects.toString()} icon={<BookOpen size={24} />} trend="Live Data" />
        <StatCard title="Revenue" value={`${settings?.currency === 'USD' ? '$' : '₹'}${stats.revenue.toLocaleString()}`} icon={<TrendingUp size={24} />} trend="This Year" />
      </div>

      <div className="grid-layout animate-in delay-200">
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)' }}>Recent Enrollments</h2>
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500 }}>Name</th>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500 }}>Batch</th>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500 }}>Date</th>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No recent enrollments</td>
                  </tr>
                ) : recentEnrollments.map((enrollment, i) => {
                  const student = enrollment.students || {};
                  const batch = enrollment.batches || {};
                  const status = student.enrollment_status === 'active' ? 'Active' : 'Inactive';
                  
                  return (
                    <tr key={enrollment.id} style={{ borderBottom: i < recentEnrollments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 500 }}>{student.full_name || 'Unknown'}</td>
                      <td style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{batch.name || 'Unassigned'}</td>
                      <td style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {enrollment.enrollment_date ? new Date(enrollment.enrollment_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem 0' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '999px', 
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: status === 'Active' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: status === 'Active' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--primary)' }}>Upcoming Classes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {upcomingClasses.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No upcoming classes scheduled.</div>
            ) : upcomingClasses.map((cls, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '4px', 
                  height: '40px', 
                  background: 'var(--accent)', 
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{cls.subjects?.name || 'Subject'}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{cls.day_of_week.substring(0, 3)} • {cls.start_time.slice(0, 5)} • {cls.batches?.name || 'Batch'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{title}</h3>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--primary)' }}>{value}</div>
        </div>
        <div style={{ color: 'var(--accent)', padding: '0.75rem', background: 'rgba(37, 99, 235, 0.08)', borderRadius: 'var(--radius)' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {trend}
      </div>
    </div>
  );
}
