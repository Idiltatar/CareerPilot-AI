import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  FileText,
  Filter,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import InterviewPractice from './InterviewPractice';

type Stage = 'Interview' | 'Applied' | 'Screening' | 'Offer' | 'Saved' | 'Rejected';
type Application = {
  id: number;
  company: string;
  role: string;
  initials: string;
  color: string;
  stage: Stage;
  date: string;
  appliedDate: string;
  source: string;
  salary: number;
  notes: string;
  archived: boolean;
  followUpDate: string;
  contactName: string;
  contactEmail: string;
};
type ApplicationPayload = {
  id: number;
  company: string;
  role: string;
  stage: Stage;
  applied_date: string;
  source: string;
  salary: number;
  notes: string;
  archived: boolean;
  follow_up_date: string | null;
  contact_name: string;
  contact_email: string;
};
type DashboardPayload = {
  metrics: { total: number; active: number; interviews: number; response_rate: number; offers: number; follow_ups: number };
  stages: { stage: Stage; count: number }[];
  applications: ApplicationPayload[];
  interviews: { id: number; company: string; role: string; kind: string; scheduled_at: string; outcome: string }[];
};
type AnalyticsPayload = {
  days: number;
  start_date: string;
  total: number;
  response_count: number;
  response_rate: number;
  average_response_days: number | null;
  interview_to_offer_rate: number;
  stages: { stage: Stage; count: number }[];
  trend: { period: string; applications: number; responses: number }[];
};

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Applications', icon: BriefcaseBusiness },
  { label: 'Interview prep', icon: MessageSquareText, fresh: true },
  { label: 'Tasks & notes', icon: ListTodo },
];

const stageClass: Record<Stage, string> = {
  Interview: 'stage-interview',
  Applied: 'stage-applied',
  Screening: 'stage-screening',
  Offer: 'stage-offer',
  Saved: 'stage-saved',
  Rejected: 'stage-rejected',
};

function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [metrics, setMetrics] = useState<DashboardPayload['metrics'] | null>(null);
  const [interviews, setInterviews] = useState<DashboardPayload['interviews']>([]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(180);
  const [analyticsRole, setAnalyticsRole] = useState('');
  const [analyticsCompany, setAnalyticsCompany] = useState('');
  const [analyticsSource, setAnalyticsSource] = useState('');
  const [activeNav, setActiveNav] = useState('Overview');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All stages');
  const [showArchived, setShowArchived] = useState(false);
  const [showAllApplications, setShowAllApplications] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState('Direct');
  const [salary, setSalary] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loadError, setLoadError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);

  async function refreshDashboard() {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('API request failed');
      const payload: DashboardPayload = await response.json();
      setApplications(payload.applications.map((item) => ({
        id: item.id,
        company: item.company,
        role: item.role,
        initials: item.company.slice(0, 1).toUpperCase(),
        color: ['green', 'blue', 'lilac', 'figma', 'ink'][item.company.length % 5],
        stage: item.stage,
        date: new Date(`${item.applied_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        appliedDate: item.applied_date,
        source: item.source,
        salary: item.salary,
        notes: item.notes,
        archived: item.archived,
        followUpDate: item.follow_up_date ?? '',
        contactName: item.contact_name,
        contactEmail: item.contact_email,
      })));
      setMetrics(payload.metrics);
      setInterviews(payload.interviews);
      setLoadError('');
    } catch {
      setLoadError('CareerPilot API is unavailable. Start Docker Compose to reconnect.');
    }
  }

  useEffect(() => {
    void fetch('/api/auth/status')
      .then((response) => response.json() as Promise<{ required: boolean; authenticated: boolean }>)
      .then((status) => {
        setAuthRequired(status.required);
        setAuthenticated(status.authenticated);
        setAuthResolved(true);
        if (status.authenticated) void refreshDashboard();
      })
      .catch(() => {
        setAuthResolved(true);
        setLoadError('Could not check the CareerPilot login status.');
      });
  }, []);

  useEffect(() => {
    if (!authResolved || !authenticated) return;
    const parameters = new URLSearchParams({ days: String(analyticsDays) });
    if (analyticsRole) parameters.set('role', analyticsRole);
    if (analyticsCompany) parameters.set('company', analyticsCompany);
    if (analyticsSource) parameters.set('source', analyticsSource);
    void fetch(`/api/analytics?${parameters.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error('Analytics request failed');
        return response.json() as Promise<AnalyticsPayload>;
      })
      .then(setAnalytics)
      .catch(() => setLoadError('Application analytics could not be loaded.'));
  }, [authResolved, authenticated, analyticsDays, analyticsRole, analyticsCompany, analyticsSource]);

  async function showArchivedApplications() {
    try {
      const response = await fetch('/api/applications?include_archived=true');
      if (!response.ok) throw new Error('Could not load archived applications');
      const records: ApplicationPayload[] = await response.json();
      setApplications(records.filter((item) => item.archived).map((item) => ({
        id: item.id,
        company: item.company,
        role: item.role,
        initials: item.company.slice(0, 1).toUpperCase(),
        color: ['green', 'blue', 'lilac', 'figma', 'ink'][item.company.length % 5],
        stage: item.stage,
        date: new Date(`${item.applied_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        appliedDate: item.applied_date,
        source: item.source,
        salary: item.salary,
        notes: item.notes,
        archived: item.archived,
        followUpDate: item.follow_up_date ?? '',
        contactName: item.contact_name,
        contactEmail: item.contact_email,
      })));
      setShowArchived(true);
      setShowAllApplications(true);
      setActiveNav('Applications');
    } catch {
      setLoadError('Archived applications could not be loaded. Please try again.');
    }
  }

  const stageCounts = useMemo(() => {
    const counts: Record<Stage, number> = { Saved: 0, Applied: 0, Screening: 0, Interview: 0, Offer: 0, Rejected: 0 };
    applications.filter((application) => !application.archived).forEach((application) => { counts[application.stage] += 1; });
    return counts;
  }, [applications]);

  const activity = analytics?.trend.map((bucket) => ({ month: bucket.period, sent: bucket.applications, replies: bucket.responses })) ?? [];
  const activityMax = Math.max(...activity.map((month) => month.sent), 1);

  const filteredApplications = useMemo(() => applications.filter((application) => {
    const matchesQuery = `${application.company} ${application.role}`.toLowerCase().includes(query.toLowerCase());
    const matchesStage = stageFilter === 'All stages' || application.stage === stageFilter;
    return matchesQuery && matchesStage;
  }), [applications, query, stageFilter]);

  function openAddApplication() {
    setEditingApplication(null);
    setCompany('');
    setRole('');
    setSource('Direct');
    setSalary('');
    setNotes('');
    setFollowUpDate('');
    setContactName('');
    setContactEmail('');
    setModalOpen(true);
  }

  function openEditApplication(application: Application) {
    setEditingApplication(application);
    setCompany(application.company);
    setRole(application.role);
    setSource(application.source);
    setSalary(application.salary ? String(application.salary) : '');
    setNotes(application.notes);
    setFollowUpDate(application.followUpDate);
    setContactName(application.contactName);
    setContactEmail(application.contactEmail);
    setActiveMenuId(null);
    setModalOpen(true);
  }

  async function saveApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();
    if (!trimmedCompany || !trimmedRole) return;
    const response = await fetch(editingApplication ? `/api/applications/${editingApplication.id}` : '/api/applications', {
      method: editingApplication ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: trimmedCompany, role: trimmedRole, source, salary: Number(salary || 0), notes, follow_up_date: followUpDate || null, contact_name: contactName, contact_email: contactEmail }),
    });
    if (!response.ok) {
      setLoadError('The application could not be saved. Please try again.');
      return;
    }
    if (showArchived) await showArchivedApplications();
    else await refreshDashboard();
    setModalOpen(false);
    setEditingApplication(null);
    setActiveNav('Applications');
  }

  async function changeStage(id: number, stage: Stage) {
    const response = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (!response.ok) {
      setLoadError('The application stage could not be updated.');
      return;
    }
    if (showArchived) await showArchivedApplications();
    else await refreshDashboard();
  }

  async function toggleArchive(application: Application) {
    const response = await fetch(`/api/applications/${application.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: !application.archived }),
    });
    if (!response.ok) {
      setLoadError('The application archive status could not be changed.');
      return;
    }
    setActiveMenuId(null);
    if (showArchived) await showArchivedApplications();
    else await refreshDashboard();
  }

  async function deleteApplication(application: Application) {
    if (!window.confirm(`Permanently delete the ${application.company} application?`)) return;
    const response = await fetch(`/api/applications/${application.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setLoadError('The application could not be deleted.');
      return;
    }
    setActiveMenuId(null);
    if (showArchived) await showArchivedApplications();
    else await refreshDashboard();
  }

  async function login(password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error('That password did not match.');
    setAuthenticated(true);
    await refreshDashboard();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    setApplications([]);
    setMetrics(null);
    setInterviews([]);
  }

  if (!authResolved) return <div className="auth-loading">Checking CareerPilot session…</div>;
  if (authRequired && !authenticated) return <LoginView onLogin={login} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveNav('Overview')}>
          <span className="brand-mark"><Target size={19} strokeWidth={2.3} /></span>
          <span>career<span className="brand-light">pilot</span><sup>AI</sup></span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">JD</span>
          <span className="workspace-copy"><strong>Jordan's workspace</strong><small>Personal account</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, fresh }) => (
            <button className={`nav-item ${activeNav === label ? 'selected' : ''}`} key={label} onClick={() => setActiveNav(label)}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {label === 'Applications' && <span className="nav-count">{metrics?.total ?? 0}</span>}
              {fresh && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={15} /></div>
            <strong>One step at a time.</strong>
            <p>Your next opportunity is closer than you think.</p>
            <button onClick={() => setActiveNav('Interview prep')}>Practice a question <ArrowRight size={13} /></button>
          </div>
          <button className="nav-item secondary-nav"><Settings2 size={17} /><span>Settings</span></button>
          <button className="profile-row" onClick={() => authRequired ? void logout() : undefined} title={authRequired ? 'Sign out' : 'Local workspace'}>
            <span className="profile-avatar">JD</span>
            <span className="workspace-copy"><strong>Jordan Davis</strong><small>{authRequired ? 'Sign out' : 'Free plan'}</small></span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <label className="global-search"><Search size={15} /><input aria-label="Search applications" placeholder="Search anything..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd><Command size={10} /> K</kbd></label>
            <button className="icon-button" aria-label="Help"><CircleHelp size={17} /></button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><i /></button>
            <span className="top-avatar">JD</span>
          </div>
        </header>

        {loadError && <div className="api-error" role="status">{loadError}</div>}
        {activeNav === 'Interview prep' ? <InterviewPractice /> : activeNav === 'Tasks & notes' ? <TasksNotesView applications={applications.filter((application) => !application.archived)} onEdit={openEditApplication} /> : <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="live-dot" /> MONDAY, OCTOBER 6, 2026</div>
              <h1>Your search, <span>in focus.</span></h1>
              <p className="welcome-subtitle">A little progress every day adds up. Here's where things stand.</p>
            </div>
            <button className="primary-button" onClick={openAddApplication}><Plus size={17} /> Add application</button>
          </section>

          <section className="stats-grid" aria-label="Application analytics">
            <article className="stat-card stat-main">
              <div className="stat-topline"><span>Applications tracked</span><span className="stat-icon mint-icon"><BriefcaseBusiness size={16} /></span></div>
              <div className="stat-number">{metrics?.total ?? '—'} <span className="stat-change"><ArrowUpRight size={13} /> tracked</span></div>
              <div className="stat-foot"><span>Saved in your workspace</span><span className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
            </article>
            <article className="stat-card">
              <div className="stat-topline"><span>Response rate</span><span className="stat-icon peach-icon"><MessageSquareText size={16} /></span></div>
              <div className="stat-number">{metrics?.response_rate ?? '—'}<span className="stat-unit">%</span></div>
              <div className="stat-foot"><span>Moved beyond saved or applied</span><span className="trend-line">↗</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-topline"><span>In the pipeline</span><span className="stat-icon yellow-icon"><TrendingUp size={16} /></span></div>
              <div className="stat-number">{metrics?.active ?? '—'} <span className="stat-unit">active</span></div>
              <div className="stat-foot"><span>Applied to interview</span><span className="foot-highlight">{metrics?.offers ?? 0} offers</span></div>
            </article>
            <article className="stat-card">
              <div className="stat-topline"><span>Interviews</span><span className="stat-icon lilac-icon"><CalendarDays size={16} /></span></div>
              <div className="stat-number">{metrics?.interviews ?? '—'} <span className="stat-unit">upcoming</span></div>
              <div className="stat-foot"><span>Scheduled interviews</span><span className="foot-highlight">View details <ArrowRight size={11} /></span></div>
            </article>
          </section>

          <section className="middle-grid">
            <article className="panel activity-panel">
              <div className="panel-heading analytics-heading"><div><h2>Application activity</h2><p>Filtered results: {analytics?.total ?? 0} · {analytics?.response_rate ?? 0}% response rate{analytics?.average_response_days !== null && analytics?.average_response_days !== undefined ? ` · ${analytics.average_response_days} days avg. response` : ''}</p></div><div className="analytics-filters">
                <label className="select-button"><select aria-label="Analytics date range" value={analyticsDays} onChange={(event) => setAnalyticsDays(Number(event.target.value))}><option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>6 months</option><option value={365}>12 months</option></select><ChevronDown size={14} /></label>
                <label className="select-button"><select aria-label="Filter analytics by role" value={analyticsRole} onChange={(event) => setAnalyticsRole(event.target.value)}><option value="">All roles</option>{Array.from(new Set(applications.map((application) => application.role))).sort().map((roleOption) => <option key={roleOption}>{roleOption}</option>)}</select><ChevronDown size={14} /></label>
                <label className="select-button analytics-extra-filter"><select aria-label="Filter analytics by company" value={analyticsCompany} onChange={(event) => setAnalyticsCompany(event.target.value)}><option value="">All companies</option>{Array.from(new Set(applications.map((application) => application.company))).sort().map((companyOption) => <option key={companyOption}>{companyOption}</option>)}</select><ChevronDown size={14} /></label>
                <label className="select-button analytics-extra-filter"><select aria-label="Filter analytics by source" value={analyticsSource} onChange={(event) => setAnalyticsSource(event.target.value)}><option value="">All sources</option>{Array.from(new Set(applications.map((application) => application.source))).sort().map((sourceOption) => <option key={sourceOption}>{sourceOption}</option>)}</select><ChevronDown size={14} /></label>
              </div></div>
              <div className="chart-legend"><span><i className="legend-current" /> Applications</span><span><i className="legend-response" /> Responses</span></div>
              <div className="chart-area">
                <div className="y-labels"><span>{activityMax}</span><span>{Math.round(activityMax * .75)}</span><span>{Math.round(activityMax * .5)}</span><span>{Math.round(activityMax * .25)}</span><span>0</span></div>
                <div className="chart-plot">
                  <div className="grid-line line-40" /><div className="grid-line line-30" /><div className="grid-line line-20" /><div className="grid-line line-10" /><div className="grid-line line-0" />
                  <div className="bar-groups">
                    {activity.map(({ month, sent, replies }) => (
                      <div className="bar-group" key={month}><div className="bars"><i className="bar-sent" style={{ height: `${sent ? Math.max(5, sent / activityMax * 90) : 0}%` }} /><i className="bar-response" style={{ height: `${sent ? Math.max(3, replies / activityMax * 90) : 0}%` }} /></div><span>{month}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
            <article className="panel pipeline-panel">
              <div className="panel-heading"><div><h2>Pipeline</h2><p>Applications by stage</p></div><button className="more-button" aria-label="Pipeline options"><MoreHorizontal size={19} /></button></div>
              <div className="pipeline-total"><strong>{metrics?.total ?? '—'}</strong><span>total applications</span></div>
              <div className="pipeline-stack" aria-label="Application stage breakdown"><i style={{ flexGrow: stageCounts.Saved, backgroundColor: '#bbc5bb' }} /><i className="pipe-applied" style={{ flexGrow: stageCounts.Applied }} /><i className="pipe-screen" style={{ flexGrow: stageCounts.Screening }} /><i className="pipe-interview" style={{ flexGrow: stageCounts.Interview }} /><i className="pipe-offer" style={{ flexGrow: stageCounts.Offer }} /><i className="pipe-rejected" style={{ flexGrow: stageCounts.Rejected }} /></div>
              <div className="pipeline-legend">
                <span><i className="pipe-key" style={{ backgroundColor: '#bbc5bb' }} />Saved <b>{stageCounts.Saved}</b></span>
                <span><i className="pipe-key key-applied" />Applied <b>{stageCounts.Applied}</b></span><span><i className="pipe-key key-screen" />Screening <b>{stageCounts.Screening}</b></span>
                <span><i className="pipe-key key-interview" />Interview <b>{stageCounts.Interview}</b></span><span><i className="pipe-key key-offer" />Offer <b>{stageCounts.Offer}</b></span>
                <span><i className="pipe-key key-rejected" />Rejected <b>{stageCounts.Rejected}</b></span>
              </div>
              <div className="pipeline-note"><ArrowUpRight size={14} /> <span><strong>{analytics?.interview_to_offer_rate ?? 0}% interview-to-offer</strong> for the selected date range</span></div>
            </article>
          </section>

          <section className="lower-grid">
            <article className="panel applications-panel">
              <div className="panel-heading application-heading">
                <div><h2>{showArchived ? 'Archived applications' : 'Recent applications'} <span className="heading-count">{showArchived ? applications.length : metrics?.total ?? applications.length}</span></h2><p>{showArchived ? 'Restore an application or remove it permanently' : 'Keep your next move close'}</p></div>
                <button className="text-link" onClick={() => { setActiveNav('Applications'); setShowAllApplications(true); }}>View all <ArrowRight size={14} /></button>
              </div>
              <div className="table-toolbar">
                <label className="table-search"><Search size={14} /><input aria-label="Filter applications" placeholder="Filter by company or role" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                <label className="filter-select"><Filter size={13} /><select aria-label="Filter by stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option>All stages</option><option>Interview</option><option>Applied</option><option>Screening</option><option>Offer</option><option>Saved</option><option>Rejected</option></select><ChevronDown size={13} /></label>
                <button className="archive-view-button" onClick={() => showArchived ? (setShowArchived(false), void refreshDashboard()) : void showArchivedApplications()}>{showArchived ? 'Active' : 'Archived'}</button>
              </div>
              <div className="applications-table">
                <div className="table-header"><span>COMPANY / ROLE</span><span>STAGE</span><span>DATE ADDED</span><span>SOURCE</span><span /></div>
                {filteredApplications.slice(0, showAllApplications ? filteredApplications.length : 10).map((application) => (
                  <div className="application-row" key={application.id}>
                    <div className="company-cell"><span className={`company-logo logo-${application.color}`}>{application.initials}</span><span><strong>{application.company}</strong><small>{application.role}</small></span></div>
                    <span><select className={`stage-pill stage-select ${stageClass[application.stage]}`} aria-label={`${application.company} stage`} value={application.stage} onChange={(event) => void changeStage(application.id, event.target.value as Stage)}>{(['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected'] as Stage[]).map((stage) => <option key={stage}>{stage}</option>)}</select></span>
                    <span className="date-cell">{application.date}</span><span className="source-cell">{application.source}</span>
                    <div className="row-actions"><button className="row-menu" aria-label={`More options for ${application.company}`} aria-expanded={activeMenuId === application.id} onClick={() => setActiveMenuId(activeMenuId === application.id ? null : application.id)}><MoreHorizontal size={17} /></button>{activeMenuId === application.id && <div className="row-action-menu"><button onClick={() => openEditApplication(application)}>Edit details</button><button onClick={() => void toggleArchive(application)}>{application.archived ? 'Restore from archive' : 'Archive'}</button><button className="destructive-action" onClick={() => void deleteApplication(application)}>Delete permanently</button></div>}</div>
                  </div>
                ))}
                {filteredApplications.length === 0 && <div className="empty-state">No applications match those filters.</div>}
              </div>
              <button className="table-footer" onClick={() => setShowAllApplications((current) => !current)}>{showAllApplications ? 'Show recent applications' : `Showing ${Math.min(filteredApplications.length, 10)} of ${filteredApplications.length} applications · View all`} <ArrowRight size={14} /></button>
            </article>

            <div className="right-column">
              <article className="panel interview-panel">
                <div className="panel-heading"><div><h2>Coming up</h2><p>Make a great impression</p></div><button className="more-button" aria-label="Interview options"><MoreHorizontal size={19} /></button></div>
                {interviews[0] ? <>
                  <div className="interview-card">
                    <div className="interview-date"><strong>{new Date(interviews[0].scheduled_at).toLocaleDateString('en-US', { day: '2-digit' })}</strong><span>{new Date(interviews[0].scheduled_at).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span></div>
                    <div className="interview-details"><strong>{interviews[0].kind}</strong><span>{interviews[0].company} <i /> {interviews[0].role}</span></div>
                    <button className="interview-more" aria-label="Interview details"><ArrowRight size={15} /></button>
                  </div>
                  <div className="interview-meta"><Clock3 size={13} /> {interviews[0].outcome} <span /> <CalendarDays size={13} /> Upcoming</div>
                </> : <div className="empty-state">No interviews scheduled yet.</div>}
                <button className="prep-button" onClick={() => setActiveNav('Interview prep')}><Sparkles size={14} /> Practice with AI <ArrowRight size={13} /></button>
              </article>
              <article className="focus-card">
                <div className="focus-top"><span className="focus-icon"><FileText size={15} /></span><span>WEEKLY FOCUS</span><button aria-label="Focus options"><MoreHorizontal size={17} /></button></div>
                <h3>Good things take<br />a few follow-ups.</h3>
                <p>3 applications are ready for a check-in.</p>
                <button className="focus-link" onClick={() => setActiveNav('Tasks & notes')}>Review follow-ups <ArrowRight size={13} /></button>
                <span className="focus-decoration" aria-hidden="true"><ArrowDownRight size={72} /></span>
              </article>
            </div>
          </section>
          <footer className="page-footer"><span>Made for the next chapter.</span><span>CareerPilot AI <i /> Your data stays yours.</span></footer>
        </div>}
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <form className="application-modal" onSubmit={saveApplication}>
          <div className="modal-heading"><div><span className="modal-icon"><Plus size={18} /></span><h2>{editingApplication ? 'Edit application' : 'Add an application'}</h2><p>{editingApplication ? 'Update the details for this opportunity.' : 'Start a new track in your search.'}</p></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setModalOpen(false)}><X size={18} /></button></div>
          <label>Company name<input autoFocus value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Acme Studio" required /></label>
          <label>Role title<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Product Designer" required /></label>
          <label>Application source<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="e.g. LinkedIn" /></label>
          <label>Expected salary<input type="number" min="0" step="1000" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="95000" /></label>
          <label>Contact name<input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Recruiter or hiring manager" /></label>
          <label>Contact email<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="name@company.com" /></label>
          <label>Follow-up date<input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></label>
          <label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Follow-up details or context" /></label>
          {!editingApplication && <div className="modal-note"><Check size={14} /> Added applications start in your Saved stage.</div>}
          <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => { setModalOpen(false); setEditingApplication(null); }}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> {editingApplication ? 'Save changes' : 'Add application'}</button></div>
        </form>
      </div>}
    </div>
  );
}

export default App;

function TasksNotesView({ applications, onEdit }: { applications: Application[]; onEdit: (application: Application) => void }) {
  const trackedItems = applications.filter((application) => application.followUpDate || application.notes || application.contactName || application.contactEmail);
  const today = new Date().toISOString().slice(0, 10);
  const dueItems = trackedItems.filter((application) => application.followUpDate && application.followUpDate <= today);
  const upcomingItems = trackedItems.filter((application) => application.followUpDate && application.followUpDate > today);

  return <section className="tasks-page">
    <div className="practice-heading"><div><span className="eyebrow">YOUR NEXT ACTIONS</span><h1>Tasks & notes</h1><p>Follow-ups and context attached to each opportunity.</p></div><span className="practice-demo">{dueItems.length} due · {upcomingItems.length} upcoming</span></div>
    {trackedItems.length === 0 ? <div className="tasks-empty">No notes or follow-ups yet. Add them to an application to keep your next step visible.</div> : <div className="tasks-list">
      {[...dueItems, ...upcomingItems, ...trackedItems.filter((application) => !application.followUpDate)].map((application) => <article className="task-row" key={application.id}>
        <div className="task-row-heading"><div><strong>{application.company}</strong><span>{application.role}</span></div><button className="archive-view-button" onClick={() => onEdit(application)}>Edit details</button></div>
        {application.followUpDate && <div className={`task-date ${application.followUpDate <= today ? 'task-overdue' : ''}`}>{application.followUpDate <= today ? 'Due' : 'Follow up'} · {new Date(`${application.followUpDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
        {(application.contactName || application.contactEmail) && <p className="task-contact">Contact: {[application.contactName, application.contactEmail].filter(Boolean).join(' · ')}</p>}
        {application.notes && <p className="task-note">{application.notes}</p>}
      </article>)}
    </div>}
  </section>;
}

function LoginView({ onLogin }: { onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin(password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-screen"><form className="login-form" onSubmit={submit}>
    <span className="brand-mark"><Target size={19} /></span>
    <span className="eyebrow">CAREERPILOT AI</span>
    <h1>Welcome back.</h1>
    <p>Sign in to your career workspace.</p>
    <label>Password<input type="password" autoComplete="current-password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
    {error && <p className="login-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form></main>;
}
