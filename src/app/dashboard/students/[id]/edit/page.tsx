"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, User, Mail, Phone, MapPin, Calendar, Users, BookOpen, GraduationCap, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/Select";
import { useFormDirty } from "@/context/FormDirtyContext";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const { attemptBack } = useFormDirty();
  useUnsavedChanges(isDirty);
  const [batches, setBatches] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    parentName: "",
    parentContact: "",
    previousSchool: "",
    board: "",
    previousGrades: "",
    currentClass: "",
    batchId: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch batches
      const { data: batchesData } = await supabase.from('batches').select('id, name').eq('status', 'active');
      if (batchesData) setBatches(batchesData);

      // Fetch student data
      const { data: studentData, error } = await supabase
        .from('students')
        .select(`*, enrollments(batch_id)`)
        .eq('id', studentId)
        .single();

      if (studentData) {
        // Split full name
        const names = (studentData.full_name || "").split(" ");
        const fName = names[0] || "";
        const lName = names.slice(1).join(" ") || "";

        setFormData({
          firstName: fName,
          lastName: lName,
          email: studentData.email || "",
          phone: studentData.contact_number || "",
          dateOfBirth: studentData.date_of_birth || "",
          gender: studentData.gender || "",
          address: studentData.address || "",
          parentName: studentData.parent_name || "",
          parentContact: studentData.parent_contact || "",
          previousSchool: studentData.previous_school || "",
          board: studentData.board || "",
          previousGrades: studentData.previous_grades || "",
          currentClass: studentData.current_class || "",
          batchId: studentData.enrollments?.[0]?.batch_id || ""
        });

        if (studentData.photo_url) {
          setPhotoPreview(studentData.photo_url);
        }
      }
      setInitialLoading(false);
    };
    fetchData();
  }, [studentId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    let uploadedPhotoUrl = photoPreview && !photoFile ? photoPreview : null; // keep old if no new file

    try {
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photoFile, { cacheControl: '3600', upsert: false });
          
        if (uploadError) {
          console.error("Photo upload error:", uploadError);
          throw new Error("Failed to upload photo. Make sure 'student-photos' bucket exists and has public insert policies.");
        }

        const { data: publicUrlData } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName);
          
        uploadedPhotoUrl = publicUrlData.publicUrl;
      }

      const { error: studentError } = await supabase
        .from('students')
        .update({ 
          full_name: fullName, 
          email: formData.email, 
          contact_number: formData.phone,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          address: formData.address || null,
          parent_name: formData.parentName || null,
          parent_contact: formData.parentContact || null,
          previous_school: formData.previousSchool || null,
          board: formData.board || null,
          previous_grades: formData.previousGrades || null,
          current_class: formData.currentClass || null,
          photo_url: uploadedPhotoUrl
        })
        .eq('id', studentId);

      if (studentError) throw studentError;

      // Handle batch update
      // Simple approach: delete existing enrollment and insert new one if changed
      await supabase.from('enrollments').delete().eq('student_id', studentId);
      
      if (formData.batchId) {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert([{ student_id: studentId, batch_id: formData.batchId }]);
        
        if (enrollError) throw enrollError;
      }

      setIsDirty(false); // Clear dirty state before navigating
      router.replace(`/dashboard/students/${studentId}`);
      
    } catch (error: any) {
      console.error('Error updating student:', error);
      alert('Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin text-muted" size={32} /></div>;
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      <div className="flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => attemptBack()} className="icon-btn" aria-label="Go back" type="button">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>Edit Student</h1>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Update student information.</p>
          </div>
        </div>
      </div>

      <form onChange={() => setIsDirty(true)} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* SECTION 1: Student Info & Photo */}
        <div className="card animate-in delay-100" style={{ padding: '2rem', position: 'relative', zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
              <User size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Student Information</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: photoPreview ? 'transparent' : 'var(--background)', border: photoPreview ? 'none' : '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                {photoPreview ? <img src={photoPreview} alt="Student Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={28} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.25rem' }}>Student Photograph</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Upload a clear passport-size photo or take one now.</p>
                <input type="file" accept="image/*" capture="user" ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }} />
                <button type="button" className="btn btn-outline" onClick={() => fileInputRef.current?.click()} style={{ padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}>
                  <Camera size={14} /> Change Photo
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="input-group">
                <label>First Name *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><User size={16} /></div>
                  <input type="text" className="input" placeholder="e.g. John" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Last Name *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><User size={16} /></div>
                  <input type="text" className="input" placeholder="e.g. Doe" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Student Email Address</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><Mail size={16} /></div>
                  <input type="email" className="input" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Student Phone Number</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><Phone size={16} /></div>
                  <input type="tel" className="input" placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Date of Birth</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><Calendar size={16} /></div>
                  <input type="date" className="input" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Gender</label>
                <CustomSelect
                  icon={<User size={16} />}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]}
                  value={formData.gender}
                  onChange={(val) => setFormData({...formData, gender: val})}
                  placeholder="Select Gender"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Academic History */}
        <div className="card animate-in delay-200" style={{ padding: '2rem', position: 'relative', zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '0.5rem', borderRadius: '8px' }}>
              <GraduationCap size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Academic History</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Previous School / College Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><BookOpen size={16} /></div>
                <input type="text" className="input" placeholder="e.g. St. Xavier's High School" value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} />
              </div>
            </div>
            <div className="input-group">
              <label>Board</label>
              <CustomSelect
                icon={<GraduationCap size={16} />}
                options={[
                  { value: 'CBSE', label: 'CBSE' },
                  { value: 'ICSE', label: 'ICSE' },
                  { value: 'State Board', label: 'State Board' },
                  { value: 'Other', label: 'Other' }
                ]}
                value={formData.board}
                onChange={(val) => setFormData({...formData, board: val})}
                placeholder="Select Board"
              />
            </div>
            <div className="input-group">
              <label>Previous Grades / Percentage</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><GraduationCap size={16} /></div>
                <input type="text" className="input" placeholder="e.g. 92% or A+" value={formData.previousGrades} onChange={e => setFormData({...formData, previousGrades: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Parents & Address */}
        <div className="card animate-in delay-300" style={{ padding: '2rem', position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', padding: '0.5rem', borderRadius: '8px' }}>
              <Users size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Parent Details & Address</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Parent / Guardian Name *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><User size={16} /></div>
                <input type="text" className="input" placeholder="e.g. Richard Doe" required value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} />
              </div>
            </div>
            <div className="input-group">
              <label>Parent Contact Number *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }}><Phone size={16} /></div>
                <input type="tel" className="input" placeholder="+91 98765 43210" required value={formData.parentContact} onChange={e => setFormData({...formData, parentContact: e.target.value})} />
              </div>
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Full Residential Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                <div className="input-icon" style={{ top: '1rem' }}><MapPin size={16} /></div>
                <textarea className="input" rows={3} placeholder="House No, Street, City, ZIP..." style={{ resize: 'vertical', paddingTop: '1rem' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Class / Enrollment */}
        <div className="card animate-in delay-300" style={{ padding: '2rem', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.5rem', borderRadius: '8px' }}>
              <BookOpen size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Enrollment Class</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Current Class / Grade *</label>
              <CustomSelect
                options={[
                  { value: 'Class 1', label: 'Class 1' },
                  { value: 'Class 2', label: 'Class 2' },
                  { value: 'Class 3', label: 'Class 3' },
                  { value: 'Class 4', label: 'Class 4' },
                  { value: 'Class 5', label: 'Class 5' },
                  { value: 'Class 6', label: 'Class 6' },
                  { value: 'Class 7', label: 'Class 7' },
                  { value: 'Class 8', label: 'Class 8' },
                  { value: 'Class 9', label: 'Class 9' },
                  { value: 'Class 10', label: 'Class 10' }
                ]}
                value={formData.currentClass}
                onChange={(val) => setFormData({...formData, currentClass: val})}
                placeholder="Select Current Class"
              />
            </div>

            <div className="input-group">
              <label>Assign Class / Batch</label>
              <CustomSelect
                options={batches.map(b => ({ value: b.id, label: b.name }))}
                value={formData.batchId}
                onChange={(val) => setFormData({...formData, batchId: val})}
                placeholder="Select a batch (Optional)"
              />
            </div>
          </div>
        </div>

        <div className="animate-in delay-300" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', marginBottom: '2rem' }}>
          <Link href={`/dashboard/students/${studentId}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
