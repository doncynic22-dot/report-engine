import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, User, Grade, Attendance, ReportConfig } from '../types';

// Helper to retrieve credentials from env or localStorage
export function getSupabaseCredentials() {
  const defaultUrl = "https://tigcnyawfhcxcdjqdfaf.supabase.co";
  const defaultKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ2NueWF3ZmhjeGNkanFkZmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjY3MDksImV4cCI6MjA5OTg0MjcwOX0.Zt0-yT0RHcjzVsuC1ngohpU1SJfX8O1RtRafosEFZvc";

  // @ts-ignore
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.SUPABASE_URL || (typeof process !== 'undefined' ? (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL) : '') || '';
  // @ts-ignore
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY) : '') || '';
  
  const localUrl = localStorage.getItem('ea_supabase_url') || '';
  const localKey = localStorage.getItem('ea_supabase_anon_key') || '';

  const url = localUrl || envUrl || defaultUrl;
  const key = localKey || envKey || defaultKey;

  return {
    url,
    key,
    isConfigured: !!url && !!key,
    source: (localUrl || localKey) ? 'localStorage' : (envUrl || envKey) ? 'env' : 'default'
  };
}

let supabaseClientInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    supabaseClientInstance = null;
    currentClientUrl = '';
    currentClientKey = '';
    return null;
  }
  
  // Re-create client if credentials changed or client is not yet created
  if (!supabaseClientInstance || supabaseClientInstance.auth === undefined || url !== currentClientUrl || key !== currentClientKey) {
    try {
      supabaseClientInstance = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
      currentClientUrl = url;
      currentClientKey = key;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      supabaseClientInstance = null;
      currentClientUrl = '';
      currentClientKey = '';
    }
  }
  return supabaseClientInstance;
}

// SQL Script for setting up tables in Supabase Console
export const SUPABASE_SQL_SCHEMA = `-- 1. Create Config Table
CREATE TABLE IF NOT EXISTS public.ea_config (
  id VARCHAR PRIMARY KEY DEFAULT 'global_config',
  school_name VARCHAR NOT NULL,
  school_year VARCHAR NOT NULL,
  term VARCHAR NOT NULL,
  principal_name VARCHAR NOT NULL,
  principal_signature_url VARCHAR,
  school_logo_text VARCHAR,
  school_logo_url VARCHAR,
  class_score_weight INTEGER NOT NULL,
  exam_score_weight INTEGER NOT NULL,
  grading_scale JSONB NOT NULL,
  report_template VARCHAR DEFAULT 'dynamic',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists on older tables
ALTER TABLE public.ea_config ADD COLUMN IF NOT EXISTS report_template VARCHAR DEFAULT 'dynamic';

-- 2. Create Pupils/Students Table
CREATE TABLE IF NOT EXISTS public.ea_students (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  roll_number VARCHAR NOT NULL,
  level VARCHAR NOT NULL,
  class_name VARCHAR NOT NULL,
  guardian_name VARCHAR NOT NULL,
  guardian_email VARCHAR NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Teachers Table
CREATE TABLE IF NOT EXISTS public.ea_teachers (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  password VARCHAR,
  level VARCHAR,
  subjects JSONB,
  classes JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Student Continuous Assessment Grades Table
CREATE TABLE IF NOT EXISTS public.ea_grades (
  student_id VARCHAR NOT NULL,
  subject_id VARCHAR NOT NULL,
  class_score NUMERIC NOT NULL,
  exam_score NUMERIC NOT NULL,
  total_score NUMERIC NOT NULL,
  grade_letter VARCHAR NOT NULL,
  remarks VARCHAR NOT NULL,
  term VARCHAR NOT NULL,
  year VARCHAR NOT NULL,
  teacher_id VARCHAR NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (student_id, subject_id, term, year)
);

-- 5. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.ea_attendance (
  student_id VARCHAR NOT NULL,
  term VARCHAR NOT NULL,
  year VARCHAR NOT NULL,
  total_days INTEGER NOT NULL,
  days_present INTEGER NOT NULL,
  remarks VARCHAR NOT NULL,
  teacher_id VARCHAR NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (student_id, term, year)
);

-- Enable Realtime for all tables if needed (Optional)
alter publication supabase_realtime add table public.ea_config;
alter publication supabase_realtime add table public.ea_students;
alter publication supabase_realtime add table public.ea_teachers;
alter publication supabase_realtime add table public.ea_grades;
alter publication supabase_realtime add table public.ea_attendance;

-- 6. Storage Bucket & Policies Setup
-- Create the public bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('eastfield', 'eastfield', true)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow Public Read Access (everyone can view/download images/files in 'eastfield')
DROP POLICY IF EXISTS "Allow public read access on eastfield bucket" ON storage.objects;
CREATE POLICY "Allow public read access on eastfield bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'eastfield');

-- Policy 2: Allow Authenticated Users (Admins and Teachers) to upload/insert files
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'eastfield');

-- Policy 3: Allow Authenticated Users to update files
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
CREATE POLICY "Allow authenticated users to update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'eastfield')
WITH CHECK (bucket_id = 'eastfield');

-- Policy 4: Allow Authenticated Users to delete files
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'eastfield');

-- Option C: Folder-Level Security (Strict Auth Folder segregation for authenticated users)
-- Uncomment these if you want users to ONLY be able to modify files within their own folder named after their User ID.
-- Note: Make sure any file uploads prefix the path with the user's authenticated ID.
-- 
-- DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
-- CREATE POLICY "Users can upload to own folder"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'eastfield'
--   AND name LIKE (auth.uid()::text || '/%')
-- );
-- 
-- DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
-- CREATE POLICY "Users can update own files"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'eastfield'
--   AND name LIKE (auth.uid()::text || '/%')
-- );
-- 
-- DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
-- CREATE POLICY "Users can delete own files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'eastfield'
--   AND name LIKE (auth.uid()::text || '/%')
-- );
-- 
-- DROP POLICY IF EXISTS "Allow anyone to upload logos" ON storage.objects;
-- CREATE POLICY "Allow anyone to upload logos"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (
--   bucket_id = 'eastfield'
--   AND name LIKE 'logos/%'
-- );

-- Policy 5 (Fallback/Demo/Testing): Allow public/anonymous uploads & updates during local development or testing phase
DROP POLICY IF EXISTS "Allow public uploads for testing" ON storage.objects;
CREATE POLICY "Allow public uploads for testing"
ON storage.objects
FOR INSERT
TO anon, authenticated, public
WITH CHECK (bucket_id = 'eastfield');

DROP POLICY IF EXISTS "Allow public updates for testing" ON storage.objects;
CREATE POLICY "Allow public updates for testing"
ON storage.objects
FOR UPDATE
TO anon, authenticated, public
USING (bucket_id = 'eastfield')
WITH CHECK (bucket_id = 'eastfield');

DROP POLICY IF EXISTS "Allow public deletes for testing" ON storage.objects;
CREATE POLICY "Allow public deletes for testing"
ON storage.objects
FOR DELETE
TO anon, authenticated, public
USING (bucket_id = 'eastfield');

-- 7. Row Level Security (RLS) & Policies for all ea_* Tables
-- Newer Supabase projects automatically enable RLS by default on newly created tables.
-- To allow your frontend app to synchronize data, you MUST either disable RLS or add public policies.

-- OPTION A: Disable RLS on the tables (Simplest & Recommended for offline-sync app design)
ALTER TABLE public.ea_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ea_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ea_teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ea_grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ea_attendance DISABLE ROW LEVEL SECURITY;

-- OPTION B: Alternatively, if you want to keep RLS active, use these unrestricted policies:
-- (Uncomment these if you prefer to keep RLS enabled)
-- ALTER TABLE public.ea_config ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public access on ea_config" ON public.ea_config;
-- CREATE POLICY "Allow public access on ea_config" ON public.ea_config FOR ALL TO anon, authenticated, public USING (true) WITH CHECK (true);

-- ALTER TABLE public.ea_students ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public access on ea_students" ON public.ea_students;
-- CREATE POLICY "Allow public access on ea_students" ON public.ea_students FOR ALL TO anon, authenticated, public USING (true) WITH CHECK (true);

-- ALTER TABLE public.ea_teachers ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public access on ea_teachers" ON public.ea_teachers;
-- CREATE POLICY "Allow public access on ea_teachers" ON public.ea_teachers FOR ALL TO anon, authenticated, public USING (true) WITH CHECK (true);

-- ALTER TABLE public.ea_grades ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public access on ea_grades" ON public.ea_grades;
-- CREATE POLICY "Allow public access on ea_grades" ON public.ea_grades FOR ALL TO anon, authenticated, public USING (true) WITH CHECK (true);

-- ALTER TABLE public.ea_attendance ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public access on ea_attendance" ON public.ea_attendance;
-- CREATE POLICY "Allow public access on ea_attendance" ON public.ea_attendance FOR ALL TO anon, authenticated, public USING (true) WITH CHECK (true);

-- 8. Automated Sync Trigger for Registered Users (Solves syntax errors like 'ERROR: 42601')
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role' = 'TEACHER') THEN
    INSERT INTO public.ea_teachers (id, name, email, role, level, classes, subjects, password, updated_at)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'New Teacher'),
      new.email,
      'TEACHER',
      new.raw_user_meta_data->>'level',
      COALESCE((new.raw_user_meta_data->'classes')::jsonb, '[]'::jsonb),
      COALESCE((new.raw_user_meta_data->'subjects')::jsonb, '[]'::jsonb),
      new.raw_user_meta_data->>'password',
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      level = EXCLUDED.level,
      classes = EXCLUDED.classes,
      subjects = EXCLUDED.subjects,
      password = EXCLUDED.password,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
`;

// Helper to verify connection by doing a simple query
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase is not configured yet.' };
  }
  try {
    const { error } = await client.from('ea_config').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.ea_config" does not exist')) {
        return { 
          success: true, 
          message: 'Connected to Supabase, but schema tables are missing! Please click "Execute Setup Script" or run the SQL schema in your Supabase SQL editor.' 
        };
      }
      return { success: false, message: `Supabase Error: ${error.message} (Code ${error.code})` };
    }
    return { success: true, message: 'Successfully connected and verified database tables!' };
  } catch (err: any) {
    return { success: false, message: `Network/Connection Error: ${err.message || err}` };
  }
}

// 1. SYNC CONFIG
export async function fetchSupabaseConfig(): Promise<ReportConfig | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('ea_config').select('*').eq('id', 'global_config').maybeSingle();
    if (error || !data) return null;
    return {
      schoolName: data.school_name,
      schoolYear: data.school_year,
      term: data.term,
      principalName: data.principal_name,
      principalSignatureUrl: data.principal_signature_url,
      schoolLogoText: data.school_logo_text,
      schoolLogoUrl: data.school_logo_url,
      classScoreWeight: data.class_score_weight,
      examScoreWeight: data.exam_score_weight,
      gradingScale: data.grading_scale,
      selectedTemplate: data.report_template || 'dynamic'
    };
  } catch {
    return null;
  }
}

export async function saveSupabaseConfig(config: ReportConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payload = {
      id: 'global_config',
      school_name: config.schoolName,
      school_year: config.schoolYear,
      term: config.term,
      principal_name: config.principalName,
      principal_signature_url: config.principalSignatureUrl || null,
      school_logo_text: config.schoolLogoText || null,
      school_logo_url: config.schoolLogoUrl || null,
      class_score_weight: config.classScoreWeight,
      exam_score_weight: config.examScoreWeight,
      grading_scale: config.gradingScale,
      report_template: config.selectedTemplate || 'dynamic',
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('ea_config').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

// 2. SYNC STUDENTS
export async function fetchSupabaseStudents(): Promise<Student[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('ea_students').select('*');
    if (error || !data) return null;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      rollNumber: item.roll_number,
      level: item.level,
      className: item.class_name,
      guardianName: item.guardian_name,
      guardianEmail: item.guardian_email,
    }));
  } catch {
    return null;
  }
}

export async function saveSupabaseStudents(students: Student[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payloads = students.map(s => ({
      id: s.id,
      name: s.name,
      roll_number: s.rollNumber,
      level: s.level,
      class_name: s.className,
      guardian_name: s.guardianName,
      guardian_email: s.guardianEmail,
      updated_at: new Date().toISOString()
    }));
    const { error } = await client.from('ea_students').upsert(payloads);
    
    // Prune deleted students
    const studentIds = students.map(s => s.id);
    if (studentIds.length > 0) {
      await client.from('ea_students').delete().not('id', 'in', `(${studentIds.join(',')})`);
    } else {
      await client.from('ea_students').delete().neq('id', '');
    }

    return !error;
  } catch {
    return false;
  }
}

// 3. SYNC TEACHERS / USERS
export async function fetchSupabaseTeachers(): Promise<User[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('ea_teachers').select('*');
    if (error || !data) return null;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      password: item.password || undefined,
      level: item.level || undefined,
      subjects: item.subjects || undefined,
      classes: item.classes || undefined,
    }));
  } catch {
    return null;
  }
}

export async function saveSupabaseTeachers(teachers: User[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payloads = teachers.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      password: t.password || null,
      level: t.level || null,
      subjects: t.subjects || null,
      classes: t.classes || null,
      updated_at: new Date().toISOString()
    }));
    const { error } = await client.from('ea_teachers').upsert(payloads);

    // Prune deleted teachers
    const teacherIds = teachers.map(t => t.id);
    if (teacherIds.length > 0) {
      await client.from('ea_teachers').delete().not('id', 'in', `(${teacherIds.join(',')})`);
    } else {
      await client.from('ea_teachers').delete().neq('id', '');
    }

    return !error;
  } catch {
    return false;
  }
}

export async function deleteSupabaseStudent(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('ea_students').delete().eq('id', id);
    // Also delete any associated grades or attendance to keep database clean
    await client.from('ea_grades').delete().eq('student_id', id);
    await client.from('ea_attendance').delete().eq('student_id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSupabaseTeacher(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('ea_teachers').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// 4. SYNC GRADES
export async function fetchSupabaseGrades(): Promise<Grade[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('ea_grades').select('*');
    if (error || !data) return null;
    return data.map(item => ({
      studentId: item.student_id,
      subjectId: item.subject_id,
      classScore: Number(item.class_score),
      examScore: Number(item.exam_score),
      totalScore: Number(item.total_score),
      gradeLetter: item.grade_letter,
      remarks: item.remarks,
      term: item.term,
      year: item.year,
      teacherId: item.teacher_id,
      updatedAt: item.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function saveSupabaseGrades(grades: Grade[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payloads = grades.map(g => ({
      student_id: g.studentId,
      subject_id: g.subjectId,
      class_score: g.classScore,
      exam_score: g.examScore,
      total_score: g.totalScore,
      grade_letter: g.gradeLetter,
      remarks: g.remarks,
      term: g.term,
      year: g.year,
      teacher_id: g.teacherId,
      updated_at: g.updatedAt || new Date().toISOString()
    }));
    const { error } = await client.from('ea_grades').upsert(payloads);
    return !error;
  } catch {
    return false;
  }
}

// 5. SYNC ATTENDANCE
export async function fetchSupabaseAttendance(): Promise<Attendance[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('ea_attendance').select('*');
    if (error || !data) return null;
    return data.map(item => ({
      studentId: item.student_id,
      term: item.term,
      year: item.year,
      totalDays: item.total_days,
      daysPresent: item.days_present,
      remarks: item.remarks,
      teacherId: item.teacher_id,
      updatedAt: item.updated_at,
    }));
  } catch {
    return null;
  }
}

export async function saveSupabaseAttendance(attendance: Attendance[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payloads = attendance.map(a => ({
      student_id: a.studentId,
      term: a.term,
      year: a.year,
      total_days: a.totalDays,
      days_present: a.daysPresent,
      remarks: a.remarks,
      teacher_id: a.teacherId,
      updated_at: a.updatedAt || new Date().toISOString()
    }));
    const { error } = await client.from('ea_attendance').upsert(payloads);
    return !error;
  } catch {
    return false;
  }
}

// Global setup helper that tries to execute the setup via RPC or instructions
export async function createTablesInSupabase(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase client is not initialized.' };

  try {
    // Note: Standard Supabase anonymized access doesn't let you run raw SQL queries directly from client SDK 
    // unless you have a database function (RPC) or use management API.
    // Instead of failing, we instruct the user beautifully and also attempt to insert mock data to verify if tables are already active.
    const { error: confError } = await client.from('ea_config').select('id').limit(1);
    if (!confError) {
      return { success: true, message: 'Tables already exist on Supabase!' };
    }
    
    return { 
      success: false, 
      message: 'Please execute the SQL Script in your Supabase Dashboard SQL Editor. The SDK does not have permission to run dynamic DDL schema queries directly.' 
    };
  } catch (err: any) {
    return { success: false, message: `Could not verify/create tables: ${err.message || err}` };
  }
}
