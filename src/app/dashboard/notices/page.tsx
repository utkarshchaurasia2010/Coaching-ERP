"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Loader2, Megaphone, Trash2, Edit, Calendar, 
  Users, Eye, EyeOff
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function NoticesPage() {
  const { settings } = useSettings();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [settings?.academic_year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: noticesData, error: noticesError } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (noticesError) throw noticesError;

      const { data: batchesData } = await supabase
        .from('batches')
        .select('id, name');

      const batchMap = (batchesData || []).reduce((acc: any, b: any) => {
        acc[b.id] = b;
        return acc;
      }, {});

      const processedNotices = (noticesData || []).map(n => ({
        ...n,
        batches: n.batch_id ? batchMap[n.batch_id] : null
      }));

      setNotices(processedNotices);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
      setNotices(notices.filter(n => n.id !== id));
    } catch (err: any) {
      alert("Failed to delete notice: " + err.message);
    }
  };

  const toggleStatus = async (notice: any) => {
    try {
      const { error } = await supabase.from('notices').update({ is_active: !notice.is_active }).eq('id', notice.id);
      if (error) throw error;
      setNotices(notices.map(n => n.id === notice.id ? { ...n, is_active: !notice.is_active } : n));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin text-muted" size={32} /></div>;
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
            Notice Board
          </h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>Broadcast announcements to parents, students, or staff.</p>
        </div>
        <Link href="/dashboard/notices/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={18} /> New Notice
        </Link>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {notices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '50%' }}>
              <Megaphone size={32} style={{ opacity: 0.5 }} />
            </div>
            <p>No notices have been published yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Notice Details</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Audience</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <tr key={notice.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{notice.title}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {notice.content}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Users size={14} className="text-muted" />
                        <span style={{ textTransform: 'capitalize' }}>
                          {notice.target_audience === 'batch' && notice.batches ? `Batch: ${notice.batches.name}` : notice.target_audience}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => toggleStatus(notice)}
                        style={{
                          background: notice.is_active ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: notice.is_active ? 'var(--success)' : 'var(--danger)',
                          border: 'none',
                          padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer'
                        }}
                      >
                        {notice.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        {notice.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} />
                        {new Date(notice.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link href={`/dashboard/notices/new?edit=${notice.id}`} className="btn btn-outline" style={{ padding: '0.5rem', textDecoration: 'none' }}>
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(notice.id)} className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
