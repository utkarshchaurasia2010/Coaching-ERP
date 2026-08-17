"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Megaphone, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";
import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function NewNoticePage() {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { settings } = useSettings();
  
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    target_audience: "all",
    batch_id: "",
    is_active: true
  });

  useEffect(() => {
    const load = async () => {
      const { data: batchesData } = await supabase
        .from('batches')
        .select('id, name')
        .eq('academic_year', settings?.academic_year || '');
      if (batchesData) setBatches(batchesData);

      if (editId) {
        const { data: notice } = await supabase
          .from('notices')
          .select('*')
          .eq('id', editId)
          .single();
        if (notice) {
          setFormData({
            title: notice.title,
            content: notice.content,
            target_audience: notice.target_audience,
            batch_id: notice.batch_id || "",
            is_active: notice.is_active
          });
        }
        setLoading(false);
      }
    };
    if (settings?.academic_year) load();
  }, [settings?.academic_year, editId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const payload = {
        title: formData.title,
        content: formData.content,
        target_audience: formData.target_audience,
        batch_id: formData.target_audience === 'batch' ? formData.batch_id : null,
        is_active: formData.is_active,
        created_by: session.user.id
      };

      if (editId) {
        const { error } = await supabase.from('notices').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notices').insert(payload);
        if (error) throw error;
      }

      setIsDirty(false);
      router.push('/dashboard/notices');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save notice.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin text-muted" size={32} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => attemptBack()}
          className="btn btn-outline"
          style={{ padding: '0.5rem', border: 'none', background: 'var(--surface-solid)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
            {editId ? 'Edit Notice' : 'Create New Notice'}
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Broadcast announcements to parents, students, or staff.</p>
        </div>
      </div>

      <div className="card animate-in delay-100">
        <form onChange={() => setIsDirty(true)} onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          <div className="input-group">
            <label>Notice Title</label>
            <div className="input-wrapper">
              <div className="input-icon"><Megaphone size={16} /></div>
              <input
                type="text"
                className="input"
                required
                placeholder="e.g. Tomorrow is a Holiday"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Content / Message</label>
            <textarea
              className="input"
              required
              rows={6}
              placeholder="Write the full announcement here..."
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              style={{ resize: 'vertical', paddingLeft: '1.25rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Target Audience</label>
              <select
                className="input"
                value={formData.target_audience}
                onChange={e => setFormData({...formData, target_audience: e.target.value})}
                style={{ paddingLeft: '1.25rem' }}
              >
                <option value="all">Everyone (Parents &amp; Staff)</option>
                <option value="parents">Parents Only</option>
                <option value="staff">Staff Only</option>
                <option value="batch">Specific Batch</option>
              </select>
            </div>

            {formData.target_audience === 'batch' && (
              <div className="input-group">
                <label>Select Batch</label>
                <select
                  className="input"
                  required
                  value={formData.batch_id}
                  onChange={e => setFormData({...formData, batch_id: e.target.value})}
                  style={{ paddingLeft: '1.25rem' }}
                >
                  <option value="">Choose a batch...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData({...formData, is_active: e.target.checked})}
            />
            <label htmlFor="is_active" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>Publish immediately</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => attemptBack()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editId ? 'Save Changes' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
