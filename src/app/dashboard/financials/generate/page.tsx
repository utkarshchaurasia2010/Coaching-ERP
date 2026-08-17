"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, IndianRupee, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/context/SettingsContext";

export default function GenerateFeesPage() {
  const router = useRouter();
  const { settings } = useSettings();
  
  const [generating, setGenerating] = useState(false);
  const [generatorData, setGeneratorData] = useState({ 
    monthlyFee: 1000, 
    admissionFee: 0, 
    examFee: 0 
  });

  const handleGenerateFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!confirm("This will generate fee cards for ALL active students. Proceed?")) return;
    
    try {
      setGenerating(true);
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, batch_id, students!inner(id, enrollment_status)')
        .eq('students.enrollment_status', 'active');
        
      if(!enrollments || enrollments.length === 0) {
        alert("No active students found!");
        return;
      }
      
      const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
      const year = settings?.academic_year || '2025-26';
      
      const feeRecords = [];
      for(const enrollment of enrollments) {
        // 1. Monthly Tuition
        if (generatorData.monthlyFee > 0) {
          for(let i = 0; i < months.length; i++) {
            const dueDate = new Date();
            dueDate.setMonth(i > 8 ? i - 9 : i + 3); 
            dueDate.setDate(10); 
            feeRecords.push({
              title: `Tuition Fee - ${months[i]}`,
              total_amount: generatorData.monthlyFee,
              student_id: enrollment.student_id,
              batch_id: enrollment.batch_id,
              due_date: dueDate.toISOString().split('T')[0],
              academic_year: year,
              status: 'pending'
            });
          }
        }
        
        // 2. Admission Fee
        if (generatorData.admissionFee > 0) {
          const admDueDate = new Date();
          admDueDate.setMonth(3); // April
          admDueDate.setDate(1);
          feeRecords.push({
            title: `Admission Fee`,
            total_amount: generatorData.admissionFee,
            student_id: enrollment.student_id,
            batch_id: enrollment.batch_id,
            due_date: admDueDate.toISOString().split('T')[0],
            academic_year: year,
            status: 'pending'
          });
        }
        
        // 3. Exam Fee
        if (generatorData.examFee > 0) {
          const examDueDate = new Date();
          examDueDate.setMonth(8); // September
          examDueDate.setDate(15);
          feeRecords.push({
            title: `Annual Exam Fee`,
            total_amount: generatorData.examFee,
            student_id: enrollment.student_id,
            batch_id: enrollment.batch_id,
            due_date: examDueDate.toISOString().split('T')[0],
            academic_year: year,
            status: 'pending'
          });
        }
      }
      
      if (feeRecords.length === 0) {
        alert("All fee amounts are 0, nothing to generate!");
        return;
      }

      for (let i = 0; i < feeRecords.length; i += 100) {
        const chunk = feeRecords.slice(i, i + 100);
        const { error } = await supabase.from('fees').insert(chunk);
        if (error) throw error;
      }
      
      alert(`Generated ${feeRecords.length} fee cards successfully!`);
      router.replace('/dashboard/financials');
    } catch (e: any) {
      alert("Error generating fees: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => router.back()} 
          className="btn btn-outline" 
          style={{ padding: '0.5rem', border: 'none', background: 'var(--surface-solid)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>Generate Annual Dues</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Mass generate fee cards for all active students</p>
        </div>
      </div>

      <div className="card animate-in delay-100">
        <form onSubmit={handleGenerateFees} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
          
          <div className="input-group">
            <label>Monthly Tuition Fee (per student)</label>
            <div className="input-wrapper">
              <div className="input-icon"><IndianRupee size={16} /></div>
              <input 
                type="number" className="input" min="0" step="1" required
                value={generatorData.monthlyFee} onChange={e => setGeneratorData({...generatorData, monthlyFee: Number(e.target.value)})}
              />
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Generates 12 monthly tuition cards (April-March) for every active student.</p>
          </div>

          <div className="input-group">
            <label>Admission Fee (one-time)</label>
            <div className="input-wrapper">
              <div className="input-icon"><IndianRupee size={16} /></div>
              <input 
                type="number" className="input" min="0" step="1" required
                value={generatorData.admissionFee} onChange={e => setGeneratorData({...generatorData, admissionFee: Number(e.target.value)})}
              />
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Generates 1 Admission Fee card (due in April) per student.</p>
          </div>

          <div className="input-group">
            <label>Annual Exam Fee</label>
            <div className="input-wrapper">
              <div className="input-icon"><IndianRupee size={16} /></div>
              <input 
                type="number" className="input" min="0" step="1" required
                value={generatorData.examFee} onChange={e => setGeneratorData({...generatorData, examFee: Number(e.target.value)})}
              />
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Generates 1 Exam Fee card (due in September) per student.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Generate All Cards
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
