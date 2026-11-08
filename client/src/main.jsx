import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const SLOTS = [
  ['morning', 'Morning (fasting)', '☀️'],
  ['after_breakfast', 'After breakfast', '🍳'],
  ['after_lunch', 'After lunch', '🥗'],
  ['after_dinner', 'After dinner', '🌙'],
];
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const readableDate = (date, options = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', options);

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function AuthScreen({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { onLogin(await request(`/auth/${register ? 'register' : 'login'}`, null, { method: 'POST', body: JSON.stringify(form) })); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="auth-shell"><div className="auth-art"><span className="brand-mark">s</span><p className="eyebrow">YOUR GENTLE DAILY COMPANION</p><h1>A little care,<br/>every day.</h1><p className="muted">A simple place to keep track of your blood sugar and notice your patterns.</p><div className="glucose-art" aria-hidden="true"><div className="glucose-orbit orbit-a"></div><div className="glucose-orbit orbit-b"></div><div className="glucose-drop"><span>G</span></div><i className="glucose-bubble bubble-one"></i><i className="glucose-bubble bubble-two"></i><div className="glucose-caption">A LITTLE CHECK-IN <span>EVERY DAY</span></div></div></div><section className="auth-card"><p className="eyebrow">WELCOME TO SWEETY</p><h2>{register ? 'Create your account' : 'Good to see you'}</h2><p className="muted">{register ? 'Start your glucose journal today.' : 'Sign in to continue to your journal.'}</p><form onSubmit={submit}>
    {register && <label>Your name<input autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ananya" required/></label>}
    <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required/></label>
    <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={register ? 'At least 8 characters' : 'Your password'} minLength={register ? 8 : undefined} required/><button type="button" className="password-toggle" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></label>
    {error && <p className="error" role="alert">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'One moment…' : register ? 'Create account' : 'Sign in'} <span>↗</span></button></form><p className="switch-auth">{register ? 'Already have an account?' : 'New to Sweety?'} <button onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Sign in' : 'Create an account'}</button></p><p className="privacy">🔒 Your health journal is private and secure.</p></section></main>;
}

function StatCard({ icon, label, value, unit }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><p>{label}</p><strong>{value ?? '—'}{value !== null && value !== undefined && <small> {unit}</small>}</strong></div>;
}

function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('sweety-session')); } catch { return null; } });
  const [date, setDate] = useState(localDate());
  const [readings, setReadings] = useState([]);
  const [reports, setReports] = useState(null);
  const [form, setForm] = useState({ slot: 'morning', value: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('daily');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const doctor = session?.user?.role === 'doctor';
  const token = session?.token;
  const load = useCallback(async () => {
    if (!token) return;
    if (doctor && !selectedPatient) { setReadings([]); setReports(null); return; }
    setLoading(true);
    try {
      const patientQuery = doctor ? `&patientId=${selectedPatient}` : '';
      const [r, summary] = await Promise.all([
        doctor ? Promise.resolve(null) : request(`/readings?date=${date}&page=1&limit=20`, token),
        request(`/reports?date=${date}${patientQuery}`, token),
      ]);
      setReadings(doctor ? summary.daily.readings : r.readings); setReports(summary); setError('');
    } catch (err) { setError(err.message); if (err.message.includes('session')) logout(); }
    finally { setLoading(false); }
  }, [token, date, doctor, selectedPatient]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!token || !doctor) return;
    request('/reports/patients', token).then(({ patients: list }) => { setPatients(list); if (list[0]) setSelectedPatient(current => current || String(list[0].id)); }).catch(err => setError(err.message));
  }, [token, doctor]);
  function login(value) { localStorage.setItem('sweety-session', JSON.stringify(value)); setSession(value); }
  function logout() { localStorage.removeItem('sweety-session'); setSession(null); }
  function resetForm() { setEditing(null); setForm({ slot: 'morning', value: '' }); }
  async function save(e) {
    e.preventDefault(); setError('');
    try {
      const body = { ...form, date, value: Number(form.value) };
      await request(editing ? `/readings/${editing}` : '/readings', token, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) });
      resetForm(); await load();
    } catch (err) { setError(err.message); }
  }
  async function remove(id) {
    if (!window.confirm('Delete this reading?')) return;
    try { await request(`/readings/${id}`, token, { method: 'DELETE' }); if (editing === id) resetForm(); await load(); }
    catch (err) { setError(err.message); }
  }
  async function addPatient(e) {
    e.preventDefault(); setError('');
    try {
      const result = await request('/reports/patients', token, { method: 'POST', body: JSON.stringify({ email: patientEmail }) });
      setPatients(list => list.some(patient => patient.id === result.patient.id) ? list : [...list, result.patient]);
      setSelectedPatient(String(result.patient.id)); setPatientEmail('');
    } catch (err) { setError(err.message); }
  }
  function edit(reading) { setEditing(reading.id); setForm({ slot: reading.slot, value: String(reading.value) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (!session) return <AuthScreen onLogin={login}/>;
  const report = reports?.[tab === 'monthly' ? 'previousMonth' : tab === 'mtd' ? 'monthToDate' : 'daily'];
  const selected = readings;
  const dayOfWeek = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' });
  return <div className="app-shell"><header className="topbar"><a href="#home" className="brand"><span className="brand-mark small">s</span><span>sweety<small>glucose journal</small></span></a><div className="top-actions"><span className="user-greeting">Hello, {session.user?.name?.split(' ')[0]} <span>✿</span></span><button className="avatar" title="Sign out" onClick={logout}>{session.user?.name?.[0]?.toUpperCase() || 'S'}</button></div></header>
    <main className="dashboard"><section className="welcome-row"><div><p className="eyebrow">{doctor ? 'PATIENT CARE' : 'YOUR HEALTH, ONE DAY AT A TIME'}</p><h1>{doctor ? 'Patient reports' : 'A gentle check-in'}<span className="accent-dot">.</span></h1><p className="muted">{doctor ? 'Review reports for patients assigned to you.' : 'Small notes today can help you see the bigger picture.'}</p></div><label className="date-picker"><span>REPORT DATE</span><input type="date" max={localDate()} value={date} onChange={e => { setDate(e.target.value); resetForm(); }}/></label></section>
    {doctor && <section className="doctor-tools panel"><label>Assigned patient<select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}><option value="">Choose a patient</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name} · {patient.email}</option>)}</select></label><form onSubmit={addPatient}><label>Add patient by email<input type="email" placeholder="patient@example.com" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} required/></label><button className="primary">Assign patient</button></form>{error && <p className="error" role="alert">{error}</p>}</section>}
    <section className="content-grid"><div className="left-column">{!doctor && <article className="panel entry-panel"><div className="panel-heading"><div><p className="eyebrow">{editing ? 'UPDATE ENTRY' : 'NEW ENTRY'}</p><h2>{editing ? 'Edit your reading' : 'How are you feeling?'}</h2></div><span className="heading-spark">✳</span></div><p className="muted small-copy">Record a reading for {readableDate(date, { day: 'numeric', month: 'long' })}.</p><form onSubmit={save}><label className="field-label">TIME OF DAY</label><div className="slot-grid">{SLOTS.map(([id, label, icon]) => <button type="button" key={id} className={`slot-option ${form.slot === id ? 'selected' : ''}`} onClick={() => setForm({ ...form, slot: id })}><span>{icon}</span><b>{label}</b>{form.slot === id && <i>✓</i>}</button>)}</div><label className="field-label value-label" htmlFor="glucose">GLUCOSE VALUE</label><div className="value-input"><input id="glucose" type="number" min="40" max="600" step="1" placeholder="—" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required/><span>mg/dL</span></div>{error && <p className="error" role="alert">{error}</p>}<div className="form-actions"><button className="primary" disabled={readings.length >= 4 && !editing}>{editing ? 'Save changes' : 'Save reading'} <span>↗</span></button>{editing && <button type="button" className="text-button" onClick={resetForm}>Cancel</button>}<span className="slots-left">{Math.max(0, 4 - readings.length)} {readings.length === 3 ? 'slot' : 'slots'} left today</span></div></form></article>}
      <article className="panel readings-panel"><div className="panel-heading readings-heading"><div><p className="eyebrow">{doctor ? "PATIENT JOURNAL" : "YOUR JOURNAL"}</p><h2>{dayOfWeek}, {readableDate(date, { day: 'numeric', month: 'long' })}</h2></div><div className="journal-heading-actions"><label className="journal-date-picker">DATE<input aria-label="Select journal date" type="date" max={localDate()} value={date} onChange={e => { setDate(e.target.value); resetForm(); }}/></label><span className="reading-count">{selected.length}/4 logged</span></div></div>{loading ? <div className="empty-state"><span>◌</span><p>Loading your readings…</p></div> : selected.length === 0 ? <div className="empty-state"><span>☼</span><p>No readings yet. Whenever you’re ready,<br/>you can add your first check-in above.</p></div> : <div className="reading-list">{SLOTS.filter(([id]) => selected.some(r => r.slot === id)).map(([id, label, icon]) => { const reading = selected.find(r => r.slot === id); return <div className="reading-row" key={reading.id}><span className="reading-emoji">{icon}</span><div className="reading-label"><b>{label}</b><small>{readableDate(reading.date, { hour: 'numeric', minute: '2-digit' }) === 'Invalid Date' ? 'Today' : 'Recorded today'}</small></div><strong>{reading.value}<small> mg/dL</small></strong>{!doctor && <div className="row-actions"><button aria-label="Edit reading" onClick={() => edit(reading)}>✎</button><button aria-label="Delete reading" onClick={() => remove(reading.id)}>×</button></div>}</div>; })}</div>}</article></div>
      <aside className="right-column"><article className="panel report-panel"><div className="report-title"><div><p className="eyebrow">{doctor ? 'PATIENT OVERVIEW' : 'YOUR OVERVIEW'}</p><h2>{doctor && patients.find(patient => String(patient.id) === selectedPatient) ? `${patients.find(patient => String(patient.id) === selectedPatient).name}’s report` : <>Looking good,<br/>one day at a time.</>}</h2></div><div className="report-flower">✿</div></div><div className="report-tabs" role="tablist"><button className={tab === 'daily' ? 'active' : ''} onClick={() => setTab('daily')}>Daily</button><button className={tab === 'mtd' ? 'active' : ''} onClick={() => setTab('mtd')}>Month to date</button><button className={tab === 'monthly' ? 'active' : ''} onClick={() => setTab('monthly')}>Last month</button></div><p className="report-range">{report ? `${readableDate(report.start, { day: 'numeric', month: 'short' })} – ${readableDate(report.end)}` : 'Loading report…'}</p><div className="stats-grid"><StatCard icon="↗" label="Highest" value={report?.highest} unit="mg/dL"/><StatCard icon="↘" label="Lowest" value={report?.lowest} unit="mg/dL"/><StatCard icon="≈" label="Average" value={report?.average} unit="mg/dL"/><StatCard icon="#" label="Readings" value={report?.count} unit="total"/></div>{report?.count === 0 && <div className="report-empty">No readings in this period yet. Your next check-in will appear here.</div>}<h3 className="chart-title">Last 7 days by time of day</h3><p className="chart-caption">Compare morning, breakfast, lunch, and dinner readings.</p>{reports?.trendReadings?.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={260}><BarChart data={reports.trendReadings} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="24%" barGap={2}><CartesianGrid stroke="#eeece5" strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} tick={{ fontSize: 9, fill: '#969388' }}/><YAxis domain={[min => Math.max(40, min - 20), max => Math.min(600, max + 20)]} tick={{ fontSize: 9, fill: '#969388' }}/><Tooltip labelFormatter={value => readableDate(value)} formatter={(value, name) => [`${value} mg/dL`, name]}/><Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} /><Bar dataKey="morning" name="Morning" fill="#548b68" radius={[3, 3, 0, 0]} maxBarSize={13}/><Bar dataKey="after_breakfast" name="After breakfast" fill="#d58a57" radius={[3, 3, 0, 0]} maxBarSize={13}/><Bar dataKey="after_lunch" name="After lunch" fill="#6788bd" radius={[3, 3, 0, 0]} maxBarSize={13}/><Bar dataKey="after_dinner" name="After dinner" fill="#a27ab3" radius={[3, 3, 0, 0]} maxBarSize={13}/></BarChart></ResponsiveContainer></div> : <div className="chart-empty">{doctor && !selectedPatient ? 'Choose an assigned patient to see the chart.' : 'Add readings during the month to see your trend.'}</div>}<div className="care-note"><span>✿</span><p><b>A little reminder</b><br/>Every reading is just one small part of your health story.</p></div></article><div className="tip-card"><span>☼</span><p><b>Keep showing up for you.</b><br/>Consistency matters more than perfection.</p></div></aside></section><footer>Made with care for your everyday health <span>✿</span></footer></main></div>;
}

export { App };
const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<React.StrictMode><App/></React.StrictMode>);
