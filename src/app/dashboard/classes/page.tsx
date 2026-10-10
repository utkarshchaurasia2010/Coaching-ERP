"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, BookOpen, Users, Edit2, Trash2, Loader2, School, DoorOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function ClassesPage() {
  const { settings } = useSettings();
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (settings?.academic_year) {
      loadData();
    }
  }, [settings?.academic_year]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch classes
      let { data: classData, error: classErr } = await supabase
        .from('classes')
        .select('*')
        .eq('academic_year', settings!.academic_year)
        .order('numeric_grade', { ascending: true });

      // If classes table doesn't have rows yet, fallback/check batches for seamless compatibility
      if (!classData || classData.length === 0) {
        const { data: batchData } = await supabase
          .from('batches')
          .select('*')
          .eq('academic_year', settings!.academic_year)
          .order('name');
        
        if (batchData && batchData.length > 0) {
          // Map batches to simulated classes so existing data shows seamlessly
          classData = batchData.map((b, idx) => ({
            id: b.id,
            name: b.name,
            numeric_grade: idx + 1,
            stream: 'General',
            academic_year: b.academic_year,
            isBatchFallback: true,
            max_capacity: b.max_capacity
          }));
        }
      }

      setClasses(classData || []);

      // Fetch sections with class details and student counts
      const { data: sectionData } = await supabase
        .from('sections')
        .select(`
          *,
          classes (name, numeric_grade),
          users:class_teacher_id (full_name)
        `)
        .eq('academic_year', settings!.academic_year);

      setSections(sectionData || []);

    } catch (err) {
      console.error("Error loading classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.stream && c.stream.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>
            Classes & Sections
          </h1>
          <p className="text-muted">Manage academic grades, division sections, and classroom capacities.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/classes/new" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Create Class / Section
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="input-wrapper" style={{ maxWidth: '400px' }}>
        <div className="input-icon"><Search size={16} /></div>
        <input 
          type="text" 
          className="input" 
          placeholder="Search classes..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader2 className="animate-spin text-muted" size={32} style={{ margin: '0 auto' }} />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <School size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
          <h3>No Classes Configured</h3>
          <p style={{ marginTop: '0.5rem' }}>Create your first school class (e.g., Class 1, Class 10, Kindergarten).</p>
          <Link href="/dashboard/classes/new" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={18} /> Add New Class
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredClasses.map((cls) => {
            const classSections = sections.filter(s => s.class_id === cls.id);
            return (
              <div key={cls.id} className="card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <School size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                        {cls.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Stream: {cls.stream || 'General'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--surface-solid)', border: '1px solid var(--border)', fontWeight: 600 }}>
                    Grade {cls.numeric_grade}
                  </span>
                </div>

                {/* Sections List */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Sections ({classSections.length > 0 ? classSections.length : '1 Standard'})
                  </div>
                  {classSections.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {classSections.map(sec => (
                        <div key={sec.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.8125rem' }}>
                          <DoorOpen size={14} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600 }}>Sec {sec.name}</span>
                          {sec.room_no && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({sec.room_no})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Section A (Standard Division)
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <Link href={`/dashboard/attendance?classId=${cls.id}`} style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                    Take Attendance &rarr;
                  </Link>
                  <Link href={`/dashboard/classes/new?editClass=${cls.id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                    <Edit2 size={13} /> Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
