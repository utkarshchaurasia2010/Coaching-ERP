"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ArrowLeft, Users, Trash2, BookText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useSettings } from "@/context/SettingsContext";

export default function NewExamPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);
  const { settings } = useSettings();
  
  const [newExam, setNewExam] = useState({
    name: "",
    date: "",
    batch_id: "",
    subjects: [{ subject_id: "", max_marks: "" }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchesRes, subjectsRes] = await Promise.all([
        supabase.from('batches').select('id, name').order('name'),
        supabase.from('subjects').select('id, name').order('name')
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setBatches(batchesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // 1. Insert into exams
      const { data: examData, error: examError } = await supabase.from('exams').insert([{
        name: newExam.name,
        date: newExam.date,
        batch_id: newExam.batch_id,
        academic_year: settings?.academic_year || null
      }]).select().single();

      if (examError) throw examError;
      
      // 2. Insert into exam_subjects
      if (examData) {
        const examId = examData.id;
        const validSubjects = newExam.subjects.filter(s => s.subject_id && s.max_marks);
        
        if (validSubjects.length > 0) {
           const subjectInserts = validSubjects.map(s => ({
             exam_id: examId,
             subject_id: s.subject_id,
             max_marks: parseFloat(s.max_marks)
           }));
           const { error: subjectsError } = await supabase.from('exam_subjects').insert(subjectInserts);
           if (subjectsError) throw subjectsError;
        }
      }
      
      setIsDirty(false);
      router.replace('/dashboard/academics/exams');
    } catch (error) {
      console.error('Error creating exam:', error);
      alert('Failed to create exam');
    } finally {
      setCreating(false);
    }
  };

  const addSubject = () => {
    setNewExam({
      ...newExam,
      subjects: [...newExam.subjects, { subject_id: "", max_marks: "" }]
    });
  };

  const removeSubject = (index: number) => {
    const newSubjects = [...newExam.subjects];
    newSubjects.splice(index, 1);
    setNewExam({
      ...newExam,
      subjects: newSubjects
    });
  };

  const updateSubject = (index: number, field: string, value: string) => {
    const newSubjects = [...newExam.subjects];
    (newSubjects[index] as any)[field] = value;
    setNewExam({
      ...newExam,
      subjects: newSubjects
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <div className="flex-between animate-in" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard/academics/exams" className="btn btn-outline" style={{ padding: "0.5rem" }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--foreground)" }}>Create New Exam</h1>
            <p className="text-muted">Set up a new exam event and assign subjects to it.</p>
          </div>
        </div>
      </div>

      <div className="card delay-100 animate-in" style={{ padding: "2rem" }}>
        <form onChange={() => setIsDirty(true)} onSubmit={handleCreateExam} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="input-group">
            <label>Exam Name</label>
            <input 
              type="text" 
              required
              className="input" 
              placeholder="e.g. Mid Term Physics"
              value={newExam.name}
              onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label>Date</label>
              <input 
                type="date" 
                required
                className="input" 
                value={newExam.date}
                onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Batch</label>
              <CustomSelect 
                options={batches.map(b => ({ value: b.id, label: b.name }))}
                value={newExam.batch_id}
                onChange={(value) => setNewExam({ ...newExam, batch_id: value })}
                placeholder="Select a batch..."
                icon={<Users size={16} />}
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Subjects</h3>
              <button type="button" onClick={addSubject} className="btn btn-outline" style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}>
                <Plus size={16} style={{ marginRight: "0.25rem" }} /> Add Subject
              </button>
            </div>
            
            {newExam.subjects.map((sub, index) => (
              <div key={index} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem", padding: "1.25rem", background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <div className="input-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label style={{ fontSize: "0.875rem" }}>Subject</label>
                  <CustomSelect 
                    options={subjects.map(s => ({ value: s.id, label: s.name }))}
                    value={sub.subject_id}
                    onChange={(value) => updateSubject(index, "subject_id", value)}
                    placeholder="Select subject"
                    icon={<BookText size={16} />}
                  />
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: "0.875rem" }}>Max Marks</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="input" 
                    placeholder="100"
                    value={sub.max_marks}
                    onChange={(e) => updateSubject(index, "max_marks", e.target.value)}
                    style={{ padding: "0.625rem" }}
                  />
                </div>
                {newExam.subjects.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeSubject(index)}
                    style={{ background: "none", border: "none", color: "var(--destructive)", cursor: "pointer", padding: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", height: "42px", width: "42px", borderRadius: "8px", transition: "background 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-solid)"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
            <Link href="/dashboard/academics/exams" className="btn btn-outline">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" style={{ paddingLeft: "2rem", paddingRight: "2rem" }} disabled={creating}>
              {creating ? <Loader2 className="animate-spin" size={18} /> : "Create Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
