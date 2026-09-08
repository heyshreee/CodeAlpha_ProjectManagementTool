import { useEffect, useState } from 'react';

const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const apiBase = import.meta.env.VITE_API_BASE || '/api/v1';
const repoUrl = 'https://github.com/heyshreee/CodeAlpha_ProjectManagementTool';
const docsUrl = 'https://heyshreee.github.io/CodeAlpha_ProjectManagementTool/';

const navLinks = [
  { label: 'Product', href: '#product' },
  { label: 'Features', href: '#features' },
  { label: 'Security', href: '#security' },
  { label: 'Analytics', href: '#analytics' },
];

const capabilities = ['Tasks', 'Projects', 'Kanban', 'Realtime', 'RBAC', 'Analytics', 'Calendar', 'Search'];

const features = [
  {
    title: 'Task Management',
    description:
      'Plan, assign, prioritize and track every task. Break big goals into clear, actionable work.',
  },
  {
    title: 'Kanban Boards',
    description:
      'Move work through your workflow with drag-and-drop boards. See progress at a glance.',
  },
  {
    title: 'Team Collaboration',
    description:
      'Comments, mentions, notifications and realtime updates keep context close to the work.',
  },
  {
    title: 'Analytics',
    description:
      'Understand progress with useful metrics — completion rates, velocity and overdue work.',
  },
];

const securityPoints = [
  'Role-based access control',
  'Project-level authorization',
  'BOLA / IDOR protection',
  'Secure password hashing',
  'Rotating refresh tokens',
  'Rate-limited authentication',
  'Validated file uploads',
  'Security-focused test coverage',
];

const securityFlow = [
  'Request',
  'Authentication',
  'Project Membership',
  'Role Authorization',
  'Resource Access',
  'Response',
];

const stacks = [
  ['React 19', 'Express 5', 'Prisma'],
  ['TypeScript', 'PostgreSQL', 'Socket.IO'],
];

const workflowSteps = [
  { number: '01', title: 'Create', desc: 'Create project and workspace' },
  { number: '02', title: 'Plan', desc: 'Assign tasks and priorities' },
  { number: '03', title: 'Build', desc: 'Collaborate in realtime' },
  { number: '04', title: 'Ship', desc: 'Track progress to done' },
];

const columns = [
  { name: 'Backlog', items: ['PF-142', 'PF-144', 'PF-147'] },
  { name: 'Todo', items: ['PF-151', 'PF-155'] },
  { name: 'In Progress', items: ['PF-163', 'PF-166'] },
  { name: 'Done', items: ['PF-91', 'PF-93', 'PF-97'] },
];

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="ProjectFlow home">
      <span className="logo-mark" aria-hidden="true" />
      <span>ProjectFlow</span>
    </a>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual">
      <div className="hv-card">
        <div className="hv-topbar">
          <div className="hv-brand">
            <span className="hv-mark" />
            ProjectFlow
          </div>
          <div className="hv-search">
            <span>⌕</span> Search tasks, projects...
          </div>
          <div className="hv-actions">
            <span>🔔</span>
            <span className="hv-avatar" />
          </div>
        </div>
        <div className="hv-body">
          <aside className="hv-side">
            {['Overview', 'My Tasks', 'Projects', 'Calendar', 'Analytics'].map((item, i) => (
              <div className={`hv-nav-item ${i === 0 ? 'active' : ''}`} key={item}>
                {item}
              </div>
            ))}
          </aside>
          <div className="hv-main">
            <div className="hv-head">
              <div>
                <h3>Good morning, Alex</h3>
                <p>Here&apos;s what&apos;s happening across your projects today.</p>
              </div>
              <span className="hv-new">+ New task</span>
            </div>
            <div className="hv-stats">
              {[
                ['Active projects', 12],
                ['Tasks in progress', 24],
                ['Completed this week', 18],
                ['On track', '94%'],
              ].map(([label, value]) => (
                <div className="hv-stat" key={label as string}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="hv-chart">
              <div className="hv-chart-label">Team velocity</div>
              <div className="hv-bars">
                {[40, 60, 50, 75, 65, 88, 100].map((h, i) => (
                  <i style={{ height: `${h}%` }} key={i} />
                ))}
              </div>
            </div>
            <div className="hv-list">
              {[
                ['PF-312', 'Design system refresh', 'In progress', 'design'],
                ['PF-318', 'API rate-limit review', 'In review', 'backend'],
                ['PF-327', 'Beta onboarding flow', 'Done', 'product'],
              ].map(([id, title, status, tag]) => (
                <div className="hv-row" key={id}>
                  <code>{id}</code>
                  <span className="hv-row-title">{title}</span>
                  <span className={`hv-row-tag ${tag}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => {
        if (active) setAuthenticated(res.ok);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <header className="site-header">
        <div className="container nav-wrap">
          <Logo />
          <nav className={`desktop-nav ${menuOpen ? 'open' : ''}`} aria-label="Primary navigation">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a
              className="sign-in github-nav"
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="ProjectFlow on GitHub"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
            {authenticated === null ? null : authenticated ? (
              <a className="button button-small button-ghost" href={`${appUrl}/`}>
                Go to dashboard
              </a>
            ) : (
              <>
                <a className="sign-in" href={`${appUrl}/login`}>
                  Sign in
                </a>
                <a className="button button-small" href={`${appUrl}/register`}>
                  Get started
                </a>
              </>
            )}
            <button
              className="menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="container hero-inner">
          <div className="hero-kicker">PROJECT MANAGEMENT FOR MODERN TEAMS</div>
          <h1 className="hero-title">
            Plan. Build.
            <br />
            Ship. Together.
          </h1>
          <p className="hero-copy">
            ProjectFlow brings tasks, projects, teams, and collaboration into one focused
            workspace.
          </p>
          <div className="hero-actions">
            {authenticated ? (
              <a className="button button-lg" href={`${appUrl}/`}>
                Go to dashboard
              </a>
            ) : (
              <a className="button button-lg" href={`${appUrl}/register`}>
                Get started free
              </a>
            )}
            <a className="button button-lg button-ghost" href="#product">
              View demo
            </a>
          </div>
          {!authenticated && <p className="hero-note">No credit card required</p>}
        </div>
      </section>

      <div className="hero-visual-wrap">
        <HeroVisual />
      </div>

      <section className="capabilities">
        <div className="container">
          <div className="cap-label">BUILT FOR PRODUCTIVE TEAMS</div>
          <div className="cap-grid">
            {capabilities.map((cap) => (
              <span className="cap-item" key={cap}>
                {cap}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section features-section" id="features">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">FEATURES</span>
            <h2>Everything in one workspace</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section kanban-section" id="product">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">KANBAN</span>
            <h2>Your workflow, your way.</h2>
            <p>
              Organize work across customizable columns, drag tasks between stages, and see
              progress without unnecessary complexity.
            </p>
          </div>
          <div className="kanban-showcase">
            {columns.map((col) => (
              <div className="kanban-col" key={col.name}>
                <div className="kanban-col-head">{col.name}</div>
                {col.items.map((item) => (
                  <div className="kanban-task" key={item}>
                    <code>{item}</code>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section collaboration-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">REAL-TIME COLLABORATION</span>
            <h2>Changes happen once. Everyone sees them.</h2>
            <p>Realtime updates, comments, mentions, notifications, and a full activity timeline.</p>
          </div>
          <div className="collab-card">
            <div className="collab-head">
              <code>PF-142</code>
              <strong>Fix authentication flow</strong>
            </div>
            <div className="collab-meta">
              <div>
                <span>Assigned</span>
                <strong>Sriram</strong>
              </div>
              <div>
                <span>Priority</span>
                <strong>High</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>In Progress</strong>
              </div>
            </div>
            <div className="collab-activity">
              <p>
                <b>Arun</b> moved this task to <em>In Progress</em>
              </p>
              <p>
                <b>Priya</b> commented <span>2m ago</span>
              </p>
            </div>
          </div>
          <div className="collab-points">
            <span>Realtime updates</span>
            <span>Comments</span>
            <span>Mentions</span>
            <span>Notifications</span>
            <span>Activity timeline</span>
          </div>
        </div>
      </section>

      <section className="section security-section" id="security">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">SECURITY</span>
            <h2>Built with security in mind</h2>
            <p>Authorization isn&apos;t an afterthought.</p>
          </div>
          <div className="security-content">
            <ul className="security-list">
              {securityPoints.map((point) => (
                <li key={point}>
                  <span className="check">✓</span> {point}
                </li>
              ))}
            </ul>
            <div className="security-flow">
              {securityFlow.map((step, i) => (
                <div className="flow-step" key={step}>
                  <span className="flow-node" />
                  {step}
                  {i < securityFlow.length - 1 && <span className="flow-line" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section analytics-section" id="analytics">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">ANALYTICS</span>
            <h2>Know where your project stands</h2>
            <p>From activity to insight.</p>
          </div>
          <div className="analytics-card">
            <div className="analytics-metric">
              <span>Completion rate</span>
              <strong>78%</strong>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '78%' }} />
              </div>
            </div>
            <div className="analytics-breakdown">
              <div className="breakdown-head">Tasks</div>
              {[
                ['Completed', 42],
                ['In Progress', 13],
                ['Todo', 8],
                ['Overdue', 3],
              ].map(([label, value]) => (
                <div className="breakdown-row" key={label as string}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section workflow-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">WORKFLOW</span>
            <h2>From idea to done</h2>
          </div>
          <div className="workflow-track">
            {workflowSteps.map((step, i) => (
              <div className="workflow-step" key={step.title}>
                <span className="workflow-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                {i < workflowSteps.length - 1 && <span className="workflow-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section stack-section">
        <div className="container">
          <div className="section-heading">
            <span className="section-eyebrow">ENGINEERED FOR RELIABILITY</span>
            <h2>Built on a modern stack</h2>
          </div>
          <div className="stack-grid">
            {stacks.flat().map((tech) => (
              <span className="stack-item" key={tech}>
                {tech}
              </span>
            ))}
          </div>
          <div className="stack-line" />
          <div className="stack-metrics">
            <span>62+ automated tests</span>
            <span>Request validation</span>
            <span>Structured logging</span>
            <span>Secure authentication</span>
            <span>Role-based authorization</span>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <h2>Ready to organize your work?</h2>
          <p>Everything your team needs to move projects forward.</p>
          {authenticated ? (
            <a className="button button-lg" href={`${appUrl}/`}>
              Go to dashboard
            </a>
          ) : (
            <a className="button button-lg" href={`${appUrl}/register`}>
              Get started
            </a>
          )}
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Logo />
            <p>A modern workspace for planning, building and shipping together.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#analytics">Analytics</a>
            <a href="#security">Security</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href={docsUrl} target="_blank" rel="noreferrer">
              Documentation
            </a>
            <a href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={`${docsUrl}api/`} target="_blank" rel="noreferrer">
              API
            </a>
          </div>
          <div className="footer-col">
            <h4>Project</h4>
            <a href={repoUrl} target="_blank" rel="noreferrer">
              CodeAlpha Internship Project
            </a>
            <a href={docsUrl} target="_blank" rel="noreferrer">
              Docs site
            </a>
          </div>
        </div>
        <div className="container copyright">
          <span>© 2026 ProjectFlow</span>
        </div>
      </footer>
    </main>
  );
}
