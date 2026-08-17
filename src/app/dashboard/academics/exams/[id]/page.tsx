"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Save, CheckCircle2, Download, Printer, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { downloadCSV } from "@/lib/export";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function ExamDetailsPage() {
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, { marks_obtained: string, remarks: string, result_id?: string }>>({});
  
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useUnsavedChanges(isDirty, "You have unsaved exam marks. Are you sure you want to leave without saving?");

  useEffect(() => {
    if (examId) {
      fetchExamDetails();
    }
  }, [examId]);

  useEffect(() => {
    if (selectedSubjectId && students.length > 0) {
      loadResultsForSubject(selectedSubjectId);
    }
  }, [selectedSubjectId, students]);

  const fetchExamDetails = async () => {
    setLoading(true);
    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, batches(name)')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExam(examData);

      // Fetch exam subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('exam_subjects')
        .select('*, subjects(name)')
        .eq('exam_id', examId);
        
      if (subjectsError) throw subjectsError;
      setExamSubjects(subjectsData || []);
      
      if (subjectsData && subjectsData.length > 0) {
        setSelectedSubjectId(subjectsData[0].id);
      }

      if (examData?.batch_id) {
        // Fetch enrolled students
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('student_id, students(id, full_name)')
          .eq('batch_id', examData.batch_id);

        if (enrollmentsError) throw enrollmentsError;
        
        const mappedStudents: any[] = (enrollmentsData || []).map((e: any) => e.students).filter(Boolean);
        setStudents(mappedStudents);
      }
    } catch (error) {
      console.error('Error fetching exam details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResultsForSubject = async (subjectId: string) => {
    setLoadingResults(true);
    setSaveSuccess(false);
    try {
      const { data: resultsData, error: resultsError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_subject_id', subjectId);

      if (resultsError) throw resultsError;

      const resultsMap: Record<string, any> = {};
      if (resultsData) {
        resultsData.forEach(r => {
          resultsMap[r.student_id] = {
            marks_obtained: r.marks_obtained !== null ? r.marks_obtained.toString() : "",
            remarks: r.remarks || "",
            result_id: r.id
          };
        });
      }
      
      // Initialize empty state for students without results
      students.forEach((s: any) => {
        if (!resultsMap[s.id]) {
          resultsMap[s.id] = { marks_obtained: "", remarks: "" };
        }
      });
      
      setResults(resultsMap);
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleResultChange = (studentId: string, field: 'marks_obtained' | 'remarks', value: string) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSaveResults = async () => {
    if (!selectedSubjectId) return;
    
    setSaving(true);
    setSaveSuccess(false);
    try {
      const upsertData = students.map(student => {
        const res = results[student.id];
        
        // Safely parse marks
        let marks = null;
        if (res.marks_obtained !== undefined && res.marks_obtained !== null && res.marks_obtained.toString().trim() !== "") {
          const parsed = parseFloat(res.marks_obtained);
          if (!isNaN(parsed)) marks = parsed;
        }

        const payload: any = {
          exam_subject_id: selectedSubjectId,
          student_id: student.id,
          marks_obtained: marks,
          remarks: res.remarks || null
        };
        
        return payload;
      }).filter(r => r.marks_obtained !== null || r.remarks); // only save if there is some data

      if (upsertData.length > 0) {
        const { error } = await supabase
          .from('exam_results')
          .upsert(upsertData, { onConflict: 'exam_subject_id,student_id' });

        if (error) throw error;
        
        setSaveSuccess(true);
        setIsDirty(false);
        // Refresh results for current subject to get the generated IDs back
        await loadResultsForSubject(selectedSubjectId);
      }
    } catch (error: any) {
      console.error('Error saving results:', error);
      alert('Failed to save results: ' + (error?.message || JSON.stringify(error)));
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedSubject) return;
    
    const formattedData = students.map(student => {
      const res = results[student.id];
      return {
        'Student ID': student.id,
        'Name': student.full_name,
        'Marks Obtained': res?.marks_obtained || '',
        'Max Marks': selectedSubject.max_marks,
        'Remarks': res?.remarks || ''
      };
    });
    
    const subjectName = selectedSubject.subjects?.name || 'Subject';
    downloadCSV(`${exam.name}_${subjectName}_Results.csv`, formattedData);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Exam not found</h2>
        <Link href="/dashboard/academics/exams" className="btn btn-primary" style={{ marginTop: '1rem', textDecoration: 'none', display: 'inline-block' }}>
          Back to Exams
        </Link>
      </div>
    );
  }

  const selectedSubject = examSubjects.find(s => s.id === selectedSubjectId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/dashboard/academics/exams" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--foreground)' }}>
            {exam.name}
          </h1>
          <p className="text-muted">
            Batch: {exam.batches?.name} | Date: {exam.date ? new Date(exam.date).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saveSuccess && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><CheckCircle2 size={16} /> Saved Successfully</span>}
          <button 
            onClick={() => window.open(`/print/exam/${examId}`, '_blank')}
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Printer size={18} />
            Print All
          </button>
          <button 
            className="btn btn-outline" 
            onClick={handleExportCSV} 
            disabled={loadingResults || students.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Upload size={18} />
            Export CSV
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSaveResults} 
            disabled={saving || !selectedSubjectId}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Results
          </button>
        </div>
      </div>

      {examSubjects.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {examSubjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => {
                if (isDirty && !window.confirm("You have unsaved exam marks. Are you sure you want to switch subjects without saving?")) return;
                setSelectedSubjectId(sub.id);
              }}
              style={{
                padding: '0.75rem 1.25rem',
                background: 'none',
                border: 'none',
                borderBottom: selectedSubjectId === sub.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: selectedSubjectId === sub.id ? 'var(--foreground)' : 'var(--text-muted)',
                fontWeight: selectedSubjectId === sub.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              {sub.subjects?.name || 'Unknown'} (Max: {sub.max_marks})
            </button>
          ))}
        </div>
      )}

      <div className="card delay-100 animate-in" style={{ padding: '0', overflow: 'hidden' }}>
        {loadingResults ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader2 className="animate-spin text-muted" size={24} style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Student Name</th>
                  <th style={{ width: '25%' }}>Marks Obtained {selectedSubject ? `(Max: ${selectedSubject.max_marks})` : ''}</th>
                  <th style={{ width: '40%' }}>Remarks</th>
                  <th style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No students enrolled in this batch.
                    </td>
                  </tr>
                ) : !selectedSubjectId ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Please select a subject to enter marks.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500, color: 'var(--foreground)' }}>
                        {student.full_name}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <input 
                          type="number"
                          className="input"
                          placeholder="Marks"
                          max={selectedSubject?.max_marks}
                          min="0"
                          step="0.1"
                          value={results[student.id]?.marks_obtained || ""}
                          onChange={(e) => handleResultChange(student.id, 'marks_obtained', e.target.value)}
                          style={{ maxWidth: '150px' }}
                        />
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <input 
                          type="text"
                          className="input"
                          placeholder="Optional remarks..."
                          value={results[student.id]?.remarks || ""}
                          onChange={(e) => handleResultChange(student.id, 'remarks', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => window.open(`/print/student-exam/${examId}/${student.id}`, '_blank')}
                          title="Print Marksheet"
                          style={{ color: 'var(--primary)', background: 'rgba(79, 70, 229, 0.1)', padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Printer size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
