'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

function Helix() {
  return (
    <svg className="helix-svg" viewBox="0 0 940 170" role="img" aria-label="Project lifecycle from idea to ship">
      <path className="rung" d="M90 40v90M180 65v40M280 40v90M380 65v40M480 40v90M580 65v40M680 40v90M780 65v40M860 40v90" />
      <path className="strand green-strand" d="M40 85 Q115 15 190 85 T340 85 T490 85 T640 85 T790 85 T900 85" />
      <path className="strand white-strand" d="M40 85 Q115 155 190 85 T340 85 T490 85 T640 85 T790 85 T900 85" />
      <circle className="pulse-node" cx="485" cy="85" r="5" />
      {[
        ['01.IDEA', 'PRD & RFC', 100],
        ['02.SPEC', 'Schema Matrix', 290],
        ['03.DEV', 'Build & iterate', 485],
        ['04.CI/CD', 'Automated checks', 680],
        ['05.SHIP', 'Production', 860],
      ].map(([title, subtitle, x], index) => (
        <g className={`helix-node ${index === 2 ? 'active' : ''}`} transform={`translate(${x} 85)`} key={title as string}>
          <circle r={index === 2 ? 28 : 24} />
          <text y="42">{title}</text>
          <text className="node-subtitle" y="56">{subtitle}</text>
        </g>
      ))}
    </svg>
  );
}

const features = [
  ['PROJECTS', 'Projects without the overhead.', 'Create focused workspaces, define milestones, assign members, and see exactly where every project stands.'],
  ['TASKS', 'Turn work into momentum.', 'Break projects into actionable tasks, assign ownership, set priorities, and move work forward.'],
  ['COLLABORATION', 'Context stays with the work.', 'Comments, attachments, activity, and decisions stay connected to the exact task they belong to.'],
];

export default function Home() {
  const root = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useGSAP(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const context = gsap.context(() => {
      gsap.from('.hero-kicker, .hero-title, .hero-copy, .hero-actions', {
        y: 28,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
      });
      gsap.from('.pipeline', { y: 45, opacity: 0, duration: 1.1, delay: 0.35, ease: 'power3.out' });
      gsap.to('.green-strand', { strokeDashoffset: -36, duration: 2.5, repeat: -1, ease: 'none' });
      gsap.to('.pulse-node', { opacity: 0.35, scale: 1.7, transformOrigin: 'center', duration: 1.3, repeat: -1, yoyo: true, ease: 'sine.inOut' });

      gsap.utils.toArray<HTMLElement>('.reveal').forEach((element) => {
        gsap.from(element, {
          y: 42,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 82%', once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>('.workflow-card').forEach((element, index) => {
        gsap.from(element, {
          y: 30,
          opacity: 0,
          duration: 0.65,
          delay: index * 0.08,
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        });
      });
    }, root);
    return () => context.revert();
  }, { scope: root });

  return (
    <main ref={root}>
      <header className="site-header">
        <div className="container nav-wrap">
          <a className="brand" href="#top" aria-label="ProjectFlow home"><span className="brand-mark"><i /><i /><b /></span><span>PROJECTFLOW</span><small>v0.9.4</small></a>
          <nav className={`desktop-nav ${menuOpen ? 'open' : ''}`} aria-label="Primary navigation">
            <a className="active" href="#product">Product</a><a href="#features">Features</a><a href="#workflow">Workflow</a><a href="#docs">Docs</a>
          </nav>
          <div className="nav-actions"><a className="sign-in" href={`${appUrl}/login`}>Sign in</a><a className="button button-light button-small" href={`${appUrl}/register`}>Get started <span>→</span></a><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>☰</button></div>
        </div>
      </header>

      <div className="telemetry"><div className="container telemetry-inner"><span><b /> CLUSTER: US-EAST-SYS-1 <em>/</em> LATENCY: 18ms <em>/</em> STRAND HARMONY: ACTIVE</span><span>RELEASE: 0.9.4-PROD <em>/</em> <strong>UPTIME 99.991%</strong></span></div></div>

      <section className="hero" id="top"><div className="grid-overlay" /><div className="container hero-inner"><div className="hero-kicker eyebrow"><span>[</span> PROJECT MANAGEMENT / 01 <span>]</span><i /> SPEC V2.4 <i /> <strong>HELIX CORE</strong></div><h1 className="hero-title">Build. Track. Ship.<br /><span>Without the clutter.</span></h1><p className="hero-copy">ProjectFlow gives engineering teams one focused workspace to organize complex roadmaps, coordinate technical work, and deliver high-velocity releases with less overhead.</p><div className="hero-actions"><a className="button button-light" href={`${appUrl}/register`}>Get started <span>→</span></a><a className="button button-dark" href="#features">Explore features <span>⌘K</span></a><div className="system-status"><b /> All systems operational <i>·</i> Real-time sync</div></div><div className="pipeline"><div className="panel-heading"><span><b>◈</b> SYNAPSE_PIPELINE <i>::</i> <strong>DNA_STRAND_FLOW</strong></span><span>HELIX FLUX: 2.4k/s <b className="live-dot" /></span></div><div className="helix-stage"><Helix /></div><div className="panel-footer"><span>SYNC_ROOT: <strong>0x481bf3</strong> &nbsp; TOPOLOGY: DNA_HELIX_MESH</span><span><b className="live-dot" /> 100% STRAND HEALTH</span></div></div></div></section>

      <section className="trust-strip"><div className="container trust-inner"><span>BUILT FOR TEAMS THAT SHIP</span><div><b>● HYPERLINE</b><b>● SYNTHESIS//LABS</b><b className="green">● KERNEL_DEV</b><b>● NEBULA STACK</b><b>● VECTORIAL</b><b className="green">● BASE9</b></div></div></section>

      <section className="section product-section" id="product"><div className="container"><div className="section-heading reveal"><div><div className="section-label">01 / WORKSPACE</div><h2>Everything your team needs.<br /><span>Nothing it doesn&apos;t.</span></h2></div><p>Projects, tasks, discussions, and delivery signals in one ultra-responsive view.</p></div><div className="workspace-window reveal"><div className="window-bar"><span>● ● ●</span><code>workspace / projectflow-core</code><span className="live-text">● live sync</span></div><div className="workspace-grid"><aside><div className="side-label">NAVIGATION</div><a className="selected" href={`${appUrl}/`}>◈ Overview <small>⌂</small></a><a href={`${appUrl}/projects`}>▣ Projects <small>12</small></a><a href={`${appUrl}/tasks`}>✓ My Tasks <small>8</small></a><a href="#workflow">◷ Calendar</a><a href={`${appUrl}/settings`}>⚙ Settings</a><div className="side-progress"><span>● CYCLE STRAND 24</span><strong>78%</strong><i><b /></i></div></aside><div className="workspace-main"><div className="toolbar"><div>⌕ &nbsp; Search tasks, projects... <kbd>⌘K</kbd></div><a href={`${appUrl}/projects`}>+ New project</a></div><div className="stats">{['PROJECTS', 'ACTIVE TASKS', 'COMPLETED', 'ON TRACK'].map((stat) => <div key={stat}><small>{stat}</small><strong>—</strong><span>Live workspace data</span></div>)}</div><div className="mini-board"><div><h3><i /> BACKLOG <small>03</small></h3><article><code>PF-301</code><b>P1</b><p>Rebuild telemetry event stream</p><span>infra · 2d</span></article><article><code>PF-304</code><b>P2</b><p>Audit dependency matrix</p><span>security · 4d</span></article></div><div><h3 className="amber"><i /> IN PROGRESS <small>02</small></h3><article><code>PF-289</code><b>P1</b><p>JWT expiration rotation</p><span>core/auth · @sarah</span></article></div><div><h3 className="green"><i /> DONE <small>14</small></h3><article className="done"><code>PF-270</code><b>✓ MERGED</b><p>CLI argument parser overhaul</p><span>tooling · 1h ago</span></article></div></div></div></div></div></div></section>

      <section className="section feature-section" id="features"><div className="container feature-row"><div className="feature-copy reveal"><div className="section-label green-text">FEATURE / 01 — PROJECTS</div><h2>Projects without the overhead.</h2><p>Create focused workspaces, define milestones, assign members, and see exactly where every project stands without status meetings or manual spreadsheets.</p><ul><li>✓ Clear ownership and role-based access</li><li>✓ Progress from real task data</li><li>✓ Activity and analytics in context</li></ul></div><div className="feature-card project-list reveal"><div className="card-heading">PROJECT PORTFOLIO <strong>LIVE</strong></div>{[['Security Dashboard', '72%', '18 / 25 tasks · Active'], ['API Gateway Engine', '86%', '44 / 51 tasks · Active'], ['Public Docs & Website', '31%', '5 / 16 tasks · Planning']].map(([name, progress, detail]) => <div className="project-item" key={name}><b>◈ {name}</b><strong>{progress}</strong><i><span style={{ width: progress }} /></i><small>{detail}</small></div>)}</div></div></section>

      <section className="section workflow-section" id="workflow"><div className="container"><div className="center-heading reveal"><div className="section-label">LIFECYCLE ARCHITECTURE</div><h2>From idea to shipped.</h2><p>Five cohesive stages for continuous feedback and less friction from proposal to release.</p></div><div className="workflow-grid">{[['01 // IDEA', 'Define the work', 'Turn problems and requirements into a clear project brief.', 'DOCS ↗'], ['02 // PLAN', 'Shape the path', 'Break goals into tasks, priorities, owners, and due dates.', 'BOARD ↗'], ['03 // BUILD', 'Move the board', 'Make progress visible with a collaborative Kanban flow.', 'TASKS ↗'], ['04 // REVIEW', 'Keep context close', 'Discuss changes, attach files, and follow the activity trail.', 'ACTIVITY ↗'], ['05 // SHIP', 'Learn and improve', 'Use analytics to understand delivery and plan the next cycle.', 'ANALYTICS ↗']].map(([label, title, body, footer], index) => <article className="workflow-card" key={label}><b className={index === 0 || index === 4 ? 'green-text' : ''}>{label}</b><h3>{title}</h3><p>{body}</p><span>{footer}</span></article>)}</div></div></section>

      <section className="section final-cta" id="docs"><div className="container"><div className="eyebrow reveal"><span>●</span> PROJECTFLOW / READY FOR YOUR TEAM</div><h2 className="reveal">Your next project<br /><span>starts here.</span></h2><p className="reveal">Bring projects, tasks, and teammates into one focused workspace built for modern engineering teams.</p><div className="hero-actions reveal"><a className="button button-light" href={`${appUrl}/register`}>Start building <span>→</span></a><a className="button button-dark" href={`${appUrl}/login`}>Open workspace <span>↗</span></a></div></div></section>

      <footer className="site-footer"><div className="container footer-inner"><div><a className="brand" href="#top"><span className="brand-mark"><i /><i /><b /></span><span>PROJECTFLOW</span></a><p>Built for teams that ship.</p></div><div><b>PRODUCT</b><a href="#features">Workspace</a><a href="#workflow">Workflow</a></div><div><b>RESOURCES</b><a href={`${appUrl}/search`}>Search</a><a href={`${appUrl}/projects`}>Projects</a></div><div><b>ACCOUNT</b><a href={`${appUrl}/login`}>Sign in</a><a href={`${appUrl}/register`}>Create account</a></div></div><div className="container copyright"><span>© 2026 ProjectFlow</span><span>LOCAL BUILD · SYSTEM_NORMAL</span></div></footer>
    </main>
  );
}
