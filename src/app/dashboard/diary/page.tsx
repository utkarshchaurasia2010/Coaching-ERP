"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, Calendar, Loader2, Sparkles, Megaphone, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function SchoolDiaryPage() {
  const { settings } = useSettings();
  const [entries, setEntries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    classId: "",
    subjectId: "",
    title: "",
    content: "",
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (settings?.academic_year) {
      loadData();
    }
  }, [settings?.academic_year]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch classes / batches
      const { data: batchData } = await supabase
        .from('batches')
        .select('id, name')
        .eq('academic_year', settings!.academic_year);
      setClasses(batchData || []);

      // Fetch subjects
      const { data: subData } = await supabase
        .from('subjects')
        .select('id, name');
      setSubjects(subData || []);

      // Fetch diary entries (or fallback notices if table not yet created)
      const { data: diaryData, error: diaryError } = await supabase
        .from('school_diary')
        .select(`
          *,
          subjects (name),
          users:created_by (full_name)
        `)
        .eq('academic_year', settings!.academic_year)
        .order('created_at', { ascending: false });

      if (diaryError || !diaryData) {
        // Fallback to notices
        const { data: noticeData } = await supabase
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false });

        setEntries(noticeData?.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          due_date: n.created_at?.split('T')[0],
          subjects: { name: 'General Circular' }
        })) || []);
      } else {
        setEntries(diaryData || []);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payload = {
        title: formData.title,
        content: formData.content,
        due_date: formData.dueDate || null,
        subject_id: formData.subjectId || null,
        created_by: session?.user?.id || null,
        academic_year: settings?.academic_year || '2026-27'
      };

      const { error } = await supabase.from('school_diary').insert([payload]);
      
      if (error) {
        // Fallback to notices
        await supabase.from('notices').insert([{
          title: formData.title,
          content: formData.content,
          target_audience: 'all',
          is_active: true,
          created_by: session?.user?.id || null
        }]);
      }

      alert("Diary entry posted successfully!");
      setShowModal(false);
      setFormData({ classId: "", subjectId: "", title: "", content: "", dueDate: new Date().toISOString().split('T')[0] });
      loadData();

    } catch (err: any) {
      console.error(err);
      alert("Failed to post entry: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
            Digital School Diary & Homework
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Daily subject homework assignments, lesson tasks, and teacher remarks.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Post Homework / Task
        </button>
      </div>

      {/* Diary Entries Feed */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 className="animate-spin text-muted" size={32} style={{ margin: '0 auto' }} />
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
          <h3>No Homework or Diary Entries</h3>
          <p style={{ marginTop: '0.5rem' }}>Teachers can post daily subject tasks and announcements here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {entries.map(entry => (
            <div key={entry.id} className="card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {entry.subjects?.name || 'General Task'}
                  </span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.25rem', color: 'var(--foreground)' }}>
                    {entry.title}
                  </h3>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>
                {entry.content}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Due: {entry.due_date ? new Date(entry.due_date).toLocaleDateString() : 'Today'}
                </span>
                <span>By {entry.users?.full_name || 'Class Teacher'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating homework entry */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-in" style={{ maxWidth: '550px', width: '100%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Post New Homework / Diary Task</h2>
            <form onSubmit={handleCreateEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="input-group">
                <label>Subject</label>
                <select 
                  className="input"
                  value={formData.subjectId} 
                  onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <option value="">General Circular / Notice</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Assignment Title *</label>
                <input 
                  type="text" 
                  className="input" 
                  required 
                  placeholder="e.g. Mathematics Chapter 4 Exercise 4.2"
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                />
              </div>

              <div className="input-group">
                <label>Detailed Instructions / Homework Content *</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  required 
                  placeholder="Enter questions, textbook pages, or guidelines for students..."
                  value={formData.content} 
                  onChange={e => setFormData({ ...formData, content: e.target.value })} 
                />
              </div>

              <div className="input-group">
                <label>Submission Due Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={formData.dueDate} 
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Post to Diary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
