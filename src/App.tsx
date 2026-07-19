/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, User, Subject, ReportConfig, Grade, Attendance } from './types';
import { 
  INITIAL_CLASSES, 
  INITIAL_SUBJECTS, 
  INITIAL_STUDENTS, 
  INITIAL_USERS, 
  INITIAL_GRADES, 
  INITIAL_ATTENDANCE, 
  DEFAULT_REPORT_CONFIG 
} from './data/mockData';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { School, ShieldCheck, GraduationCap, Users2, FileCheck, CheckCircle2, Lock, Sparkles, BookOpen, Eye, EyeOff, Database } from 'lucide-react';
import {
  getSupabaseCredentials,
  testSupabaseConnection,
  fetchSupabaseConfig,
  fetchSupabaseStudents,
  fetchSupabaseTeachers,
  fetchSupabaseGrades,
  fetchSupabaseAttendance,
  saveSupabaseConfig,
  saveSupabaseStudents,
  saveSupabaseTeachers,
  saveSupabaseGrades,
  saveSupabaseAttendance,
  SUPABASE_SQL_SCHEMA
} from './lib/supabase';


export default function App() {
  // Master States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG);
  const [isInitialized, setIsInitialized] = useState(false);

  // Nav State: 'hub' | 'admin' | 'teacher'
  const [activePortal, setActivePortal] = useState<'hub' | 'admin' | 'teacher'>('hub');

  // Admin Security Lock Gate State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@eastfield.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [storedAdminPassword, setStoredAdminPassword] = useState(() => localStorage.getItem('ea_admin_password') || 'adminSecure2026!');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleUpdateAdminPassword = (newPass: string) => {
    setStoredAdminPassword(newPass);
    localStorage.setItem('ea_admin_password', newPass);
  };

  // Active Logged-in Teacher State (null if not logged in)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Supabase Sync States
  const [supabaseStatus, setSupabaseStatus] = useState<{ isConfigured: boolean; isConnected: boolean; message: string }>({
    isConfigured: false,
    isConnected: false,
    message: 'Supabase is not configured.'
  });
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState(false);

  // Check connection status
  const checkSupabaseStatus = async () => {
    const creds = getSupabaseCredentials();
    if (!creds.isConfigured) {
      setSupabaseStatus({
        isConfigured: false,
        isConnected: false,
        message: 'No credentials found. Please configure Supabase in settings.'
      });
      return false;
    }

    setSupabaseStatus(prev => ({ ...prev, isConfigured: true, message: 'Verifying connection...' }));
    const result = await testSupabaseConnection();
    setSupabaseStatus({
      isConfigured: true,
      isConnected: result.success,
      message: result.message
    });
    return result.success;
  };

  // Pull all tables from Supabase
  const handlePullFromSupabase = async () => {
    setIsSupabaseSyncing(true);
    try {
      const active = await checkSupabaseStatus();
      if (!active) {
        setIsSupabaseSyncing(false);
        return false;
      }

      const sConfig = await fetchSupabaseConfig();
      const sStudents = await fetchSupabaseStudents();
      const sTeachers = await fetchSupabaseTeachers();
      const sGrades = await fetchSupabaseGrades();
      const sAttendance = await fetchSupabaseAttendance();

      if (sConfig) {
        setConfig(sConfig);
        localStorage.setItem('ea_config', JSON.stringify(sConfig));
      }
      if (sStudents) {
        setStudents(sStudents);
        localStorage.setItem('ea_students', JSON.stringify(sStudents));
      }
      if (sTeachers) {
        setTeachers(sTeachers);
        localStorage.setItem('ea_teachers', JSON.stringify(sTeachers));
      }
      if (sGrades) {
        setGrades(sGrades);
        localStorage.setItem('ea_grades', JSON.stringify(sGrades));
      }
      if (sAttendance) {
        setAttendance(sAttendance);
        localStorage.setItem('ea_attendance', JSON.stringify(sAttendance));
      }

      setIsSupabaseSyncing(false);
      return true;
    } catch (e: any) {
      console.error('Failed pulling from Supabase:', e);
      setIsSupabaseSyncing(false);
      return false;
    }
  };

  // Push all local states to Supabase
  const handlePushToSupabase = async () => {
    setIsSupabaseSyncing(true);
    try {
      const active = await checkSupabaseStatus();
      if (!active) {
        setIsSupabaseSyncing(false);
        return false;
      }

      const okConfig = await saveSupabaseConfig(config);
      const okStudents = await saveSupabaseStudents(students);
      const okTeachers = await saveSupabaseTeachers(teachers);
      const okGrades = await saveSupabaseGrades(grades);
      const okAttendance = await saveSupabaseAttendance(attendance);

      setIsSupabaseSyncing(false);
      return okConfig && okStudents && okTeachers && okGrades && okAttendance;
    } catch (e: any) {
      console.error('Failed pushing to Supabase:', e);
      setIsSupabaseSyncing(false);
      return false;
    }
  };

  // 1. INITIALIZE MASTER STATES FROM LOCALSTORAGE OR MOCK DATA
  useEffect(() => {
    const demoStudentIds = [
      'st-01', 'st-02', 'st-03', 'st-04', 'st-05', 'st-06', 'st-07', 'st-07a', 'st-07b',
      'st-08', 'st-09', 'st-10', 'st-11', 'st-12', 'st-13', 'st-14', 'st-15', 'st-16', 'st-17', 'st-18', 'st-19'
    ];
    const demoTeacherEmails = ['nursery@eastfield.com', 'primary@eastfield.com', 'jhs@eastfield.com'];

    const cachedStudents = localStorage.getItem('ea_students');
    const cachedTeachers = localStorage.getItem('ea_teachers');
    const cachedGrades = localStorage.getItem('ea_grades');
    const cachedAttendance = localStorage.getItem('ea_attendance');
    const cachedConfig = localStorage.getItem('ea_config');

    let finalStudents: Student[] = [];
    if (cachedStudents) {
      const parsed = JSON.parse(cachedStudents) as Student[];
      finalStudents = parsed.filter(s => !demoStudentIds.includes(s.id));
    }
    setStudents(finalStudents);
    localStorage.setItem('ea_students', JSON.stringify(finalStudents));

    let finalTeachers: User[] = [];
    if (cachedTeachers) {
      const parsed = JSON.parse(cachedTeachers) as User[];
      finalTeachers = parsed.filter(t => !demoTeacherEmails.includes(t.email.toLowerCase()));
    }
    setTeachers(finalTeachers);
    localStorage.setItem('ea_teachers', JSON.stringify(finalTeachers));

    let finalGrades: Grade[] = [];
    if (cachedGrades) {
      const parsed = JSON.parse(cachedGrades) as Grade[];
      finalGrades = parsed.filter(g => !demoStudentIds.includes(g.studentId));
    }
    setGrades(finalGrades);
    localStorage.setItem('ea_grades', JSON.stringify(finalGrades));

    let finalAttendance: Attendance[] = [];
    if (cachedAttendance) {
      const parsed = JSON.parse(cachedAttendance) as Attendance[];
      finalAttendance = parsed.filter(a => !demoStudentIds.includes(a.studentId));
    }
    setAttendance(finalAttendance);
    localStorage.setItem('ea_attendance', JSON.stringify(finalAttendance));

    if (cachedConfig) {
      const parsed = JSON.parse(cachedConfig);
      parsed.gradingScale = DEFAULT_REPORT_CONFIG.gradingScale;
      setConfig(parsed);
      localStorage.setItem('ea_config', JSON.stringify(parsed));
    } else {
      setConfig(DEFAULT_REPORT_CONFIG);
      localStorage.setItem('ea_config', JSON.stringify(DEFAULT_REPORT_CONFIG));
    }

    // Load from Supabase if configured
    const initSupabase = async () => {
      const creds = getSupabaseCredentials();
      if (creds.isConfigured) {
        const ok = await checkSupabaseStatus();
        if (ok) {
          // Pull latest records to keep local states synced
          await handlePullFromSupabase();
        }
      }
      setIsInitialized(true);
    };
    initSupabase();
  }, []);

  // 2. SAVE STATE MUTATIONS BACK TO LOCAL STORAGE AND SUPABASE (AUTO-SYNC)
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('ea_students', JSON.stringify(students));
    const creds = getSupabaseCredentials();
    if (creds.isConfigured) saveSupabaseStudents(students);
  }, [students, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('ea_teachers', JSON.stringify(teachers));
    const creds = getSupabaseCredentials();
    if (creds.isConfigured) saveSupabaseTeachers(teachers);
  }, [teachers, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('ea_grades', JSON.stringify(grades));
    const creds = getSupabaseCredentials();
    if (creds.isConfigured) saveSupabaseGrades(grades);
  }, [grades, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('ea_attendance', JSON.stringify(attendance));
    const creds = getSupabaseCredentials();
    if (creds.isConfigured) saveSupabaseAttendance(attendance);
  }, [attendance, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('ea_config', JSON.stringify(config));
    const creds = getSupabaseCredentials();
    if (creds.isConfigured) saveSupabaseConfig(config);
  }, [config, isInitialized]);


  // 3. SECURE ADMIN PASSWORD CHECK
  const handleAdminGateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (adminEmail.toLowerCase() === 'admin@eastfield.com' && adminPassword === storedAdminPassword) {
      setIsAdminAuthenticated(true);
    } else {
      setAdminError('Access Denied: Invalid administrative credentials.');
    }
  };

  // Helper reset app to original state
  const handleResetApplicationState = () => {
    if (confirm('Warning: This will clear all custom inputs and reset the registry back to default Academy demo records. Proceed?')) {
      localStorage.clear();
      setStudents(INITIAL_STUDENTS);
      setTeachers(INITIAL_USERS);
      setGrades(INITIAL_GRADES);
      setAttendance(INITIAL_ATTENDANCE);
      setConfig(DEFAULT_REPORT_CONFIG);
      setIsAdminAuthenticated(false);
      setActivePortal('hub');
      alert('Application records reset successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-mauve-50 text-gray-800 font-sans pb-12 print:pb-0">
      {/* GLOBAL HIGH-CONTRAST HEADER NAVBAR - HIDE IN PRINT */}
      <header className="bg-white border-b border-mauve-500/20 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Academy Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePortal('hub')}>
            {config.schoolLogoUrl ? (
              <img 
                src={config.schoolLogoUrl} 
                alt={`${config.schoolName} logo`} 
                className="w-10 h-10 object-contain rounded-lg shadow-sm shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-mauve-900 text-white font-display font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                {config.schoolLogoText || 'EA'}
              </div>
            )}
            <div>
              <span className="font-display font-extrabold text-sm tracking-tight text-mauve-900 block uppercase">
                {config.schoolName}
              </span>
              <span className="text-[9px] font-mono tracking-wider text-mauve-600 uppercase block">
                Terminal Report Engine v4.0
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setActivePortal('hub')}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activePortal === 'hub'
                  ? 'bg-mauve-900 text-white border border-mauve-900 shadow-sm'
                  : 'text-mauve-900/70 hover:bg-mauve-100 border border-transparent'
              }`}
            >
              Academy Hub
            </button>
            {!isAdminAuthenticated && (
              <button
                onClick={() => setActivePortal('teacher')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePortal === 'teacher'
                    ? 'bg-mauve-900 text-white border border-mauve-900 shadow-sm'
                    : 'text-mauve-900/70 hover:bg-mauve-100 border border-transparent'
                }`}
                id="nav-teacher-portal"
              >
                Teacher Portal
              </button>
            )}
            {!currentUser && (
              <button
                onClick={() => setActivePortal('admin')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  activePortal === 'admin'
                    ? 'bg-mauve-900 text-white border border-mauve-900 shadow-sm'
                    : 'text-mauve-900/70 hover:bg-mauve-100 border border-transparent'
                }`}
                id="nav-admin-portal"
              >
                Admin Portal
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* CORE FRAME CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* A. GENERAL HUB INFORMATION SCREEN */}
        {activePortal === 'hub' && (
          <div className="space-y-6 animate-fadeIn no-print">
            {/* 1. Hero Welcome Card */}
            <div className="bg-white p-6 sm:p-10 rounded-lg border border-mauve-500/20 text-center max-w-3xl mx-auto space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <School className="w-48 h-48 text-mauve-900" />
              </div>
              
              <div className="mx-auto flex items-center justify-center">
                {config.schoolLogoUrl ? (
                  <img 
                    src={config.schoolLogoUrl} 
                    alt={`${config.schoolName} logo`} 
                    className="w-16 h-16 object-contain rounded-lg shadow-md border border-mauve-500/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-mauve-100 text-mauve-900 flex items-center justify-center border border-mauve-500/10">
                    <School className="w-6 h-6" />
                  </div>
                )}
              </div>
 
              <div className="space-y-1.5 relative z-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-mauve-900 bg-mauve-100 px-2.5 py-0.5 rounded">
                  Ghanaian Basic Education Framework
                </span>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-mauve-900 tracking-tight uppercase">
                  EASTFILED ACADEMY REPORT MANAGEMENT SYSTEM
                </h1>
                <p className="text-xs text-gray-600 max-w-xl mx-auto leading-relaxed">
                  A high-fidelity record platform designed for Eastfield Academy teachers and administrators to automate pupil evaluations, log term attendances, and generate crisp transcript cards.
                </p>
              </div>
 
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-1 relative z-10">
                <button
                  onClick={() => setActivePortal('teacher')}
                  className="bg-mauve-900 hover:bg-mauve-700 text-white font-bold px-5 py-2.5 rounded text-xs transition cursor-pointer shadow-sm uppercase tracking-wider"
                >
                  Enter Teacher Classroom Log
                </button>
                <button
                  onClick={() => setActivePortal('admin')}
                  className="bg-white border border-mauve-900/30 hover:bg-mauve-50 text-mauve-900 font-bold px-5 py-2.5 rounded text-xs transition cursor-pointer uppercase tracking-wider"
                >
                  Manage School Admissions
                </button>
              </div>
            </div>
 
            {/* 2. Feature Highlights Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto pt-2">
              {[
                {
                  title: 'Automated Marking Engine',
                  desc: 'Weighs continuous class assignments at 30% and term examinations at 70%, dynamically outputting standard letter codes and contextual performance evaluations.',
                  icon: FileCheck,
                  badge: 'Standardized'
                },
                {
                  title: 'Divisional Security Access',
                  desc: 'Distinct user portals for administrative operations and teachers. Teacher portals are locked behind classroom registrations to ensure gradebook integrity.',
                  icon: ShieldCheck,
                  badge: 'Secure'
                },
                {
                  title: 'Customizable PDF Transcripts',
                  desc: 'Fine-tune transcript layouts directly in-browser. Customize principal stamp designations, signature layers, and student conduct boards before printing.',
                  icon: GraduationCap,
                  badge: 'A4 Ready'
                }
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} className="bg-white p-5 rounded-lg border border-mauve-500/20 flex flex-col justify-between space-y-3 shadow-sm hover:border-mauve-500/40 transition-colors">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="p-2 rounded bg-mauve-100 text-mauve-900 border border-mauve-500/10">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-[#EBDDEB] text-mauve-900 px-2 py-0.5 rounded uppercase tracking-wider">
                          {feat.badge}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-mauve-900 text-sm">{feat.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* B. ADMIN PORTAL ROUTE */}
        {activePortal === 'admin' && (
          <div className="space-y-6">
            {currentUser ? (
              /* RESTRICTED VIEWS FOR TEACHERS */
              <div className="max-w-md mx-auto bg-white p-6 rounded-lg border border-rose-200 text-center space-y-4 no-print animate-fadeIn shadow-sm">
                <div className="w-12 h-12 rounded bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-rose-900 text-base">Access Denied: Teacher Restriction</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  As a registered teacher, you are strictly restricted from accessing administrative controls and database configurations. Please sign out from the Teacher Portal to authorize as an administrator.
                </p>
                <button
                  onClick={() => setActivePortal('teacher')}
                  className="px-4 py-2 bg-mauve-900 hover:bg-mauve-700 text-white font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Return to Teacher Workspace
                </button>
              </div>
            ) : !isAdminAuthenticated ? (
              /* ADMIN SECURITY ACCESS CODES FOR DEMO */
              <div className="max-w-md mx-auto bg-white p-6 rounded-lg border border-mauve-500/20 space-y-4 no-print animate-fadeIn shadow-sm">
                <div className="text-center space-y-1.5">
                  <div className="w-10 h-10 rounded bg-mauve-100 text-mauve-900 mx-auto flex items-center justify-center border border-mauve-500/10">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-mauve-900 text-base">Administrative Access Security</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Sign in with administrative credentials to access student admissions, staff mapping, and report configurations.</p>
                </div>

                {adminError && (
                  <div className="bg-rose-50 text-rose-700 p-2.5 rounded border border-rose-200 text-xs text-center font-bold">
                    {adminError}
                  </div>
                )}

                <form onSubmit={handleAdminGateLogin} className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-mauve-900 block">Admin Email ID</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@eastfield.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-mauve-500/20 outline-none text-mauve-900 bg-white focus:ring-1 focus:ring-mauve-900 text-xs"
                    />
                  </div>

                  <div className="space-y-1 text-left relative">
                    <label className="text-[10px] uppercase font-bold text-mauve-900 block">Admin Security Password</label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        required
                        placeholder="Enter password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full pl-3 pr-10 py-2 rounded border border-mauve-500/20 outline-none text-mauve-900 bg-white focus:ring-1 focus:ring-mauve-900 text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-mauve-900 focus:outline-none cursor-pointer"
                        id="btn-show-admin-password"
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-mauve-900 hover:bg-mauve-700 text-white font-bold rounded text-xs transition cursor-pointer shadow-sm uppercase tracking-wider"
                  >
                    Authorize Administrative Credentials
                  </button>
                </form>
              </div>
            ) : (
              /* AUTHORIZED ADMIN MODULES */
              <AdminDashboard
                students={students}
                setStudents={setStudents}
                teachers={teachers}
                setTeachers={setTeachers}
                subjects={INITIAL_SUBJECTS}
                grades={grades}
                attendance={attendance}
                setAttendance={setAttendance}
                config={config}
                setConfig={setConfig}
                classes={INITIAL_CLASSES}
                onSignOut={() => {
                  setIsAdminAuthenticated(false);
                  setAdminPassword('');
                }}
                supabaseStatus={supabaseStatus}
                isSupabaseSyncing={isSupabaseSyncing}
                onPullFromSupabase={handlePullFromSupabase}
                onPushToSupabase={handlePushToSupabase}
                onCheckSupabaseStatus={checkSupabaseStatus}
                storedAdminPassword={storedAdminPassword}
                onUpdateAdminPassword={handleUpdateAdminPassword}
              />
            )}
          </div>
        )}

        {/* C. TEACHER PORTAL ROUTE */}
        {activePortal === 'teacher' && (
          isAdminAuthenticated ? (
            <div className="max-w-md mx-auto bg-white p-6 rounded-lg border border-rose-200 text-center space-y-4 no-print animate-fadeIn shadow-sm">
              <div className="w-12 h-12 rounded bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-rose-900 text-base">Access Denied: Admin Restriction</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                As an authenticated administrator, you are strictly restricted from accessing the teacher classroom portal and grade books. Please sign out from the Admin Dashboard first.
              </p>
              <button
                onClick={() => setActivePortal('admin')}
                className="px-4 py-2 bg-mauve-900 hover:bg-mauve-700 text-white font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Return to Admin Workspace
              </button>
            </div>
          ) : (
            <TeacherDashboard
              students={students}
              teachers={teachers}
              setTeachers={setTeachers}
              subjects={INITIAL_SUBJECTS}
              grades={grades}
              setGrades={setGrades}
              attendance={attendance}
              setAttendance={setAttendance}
              config={config}
              classes={INITIAL_CLASSES}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              isAdminAuthenticated={isAdminAuthenticated}
            />
          )
        )}
      </main>

      {/* FOOTER - HIDE IN PRINT */}
      <footer className="mt-16 border-t border-mauve-100/60 pt-8 text-center text-xs text-mauve-400 no-print">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-mauve-600/70">Eastfield Academy basic education center</p>
          <p className="mt-1">© 2026 Eastfield Academy. Academic Marks Board. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
