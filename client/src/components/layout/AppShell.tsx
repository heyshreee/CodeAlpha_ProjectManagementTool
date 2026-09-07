import { Outlet, Link, useNavigate, useParams } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import CommandPalette from './CommandPalette';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  // Ctrl/Cmd+K opens the in-app command palette (search + quick actions) instead
  // of handing off to the browser's built-in search / Google.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setCreateOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close the create menu on outside click.
  useEffect(() => {
    if (!createOpen) return;
    function onClick(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [createOpen]);

  const { id: projectId } = useParams();

  return (
    <div className="h-full flex bg-surface surface-grid">
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface-2/90 backdrop-blur border-b border-edge flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-md text-slate-400 hover:bg-surface-3 hover:text-slate-100"
            aria-label="Open navigation"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" /><span className="block w-5 h-0.5 bg-current mb-1" /><span className="block w-5 h-0.5 bg-current" />
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex-1 max-w-2xl text-left"
            aria-label="Open search command palette"
          >
            <div className="relative cursor-text">
              <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                readOnly
                tabIndex={-1}
                placeholder="Search tasks, projects…"
                aria-label="Open search command palette"
                className="w-full bg-surface-3/60 border border-edge rounded-md pl-9 pr-16 h-10 text-[13px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-edge px-1.5 py-0.5 text-[10px] text-slate-500">Ctrl K</kbd>
            </div>
          </button>

          <div className="flex items-center gap-1 sm:gap-2.5 ml-auto">
            <div className="relative" ref={createRef}>
              <button
                type="button"
                onClick={() => setCreateOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 h-9 px-3.5 text-[13px] font-medium text-white hover:bg-brand-400 transition"
                aria-haspopup="menu"
                aria-expanded={createOpen}
              >
                <span className="text-base leading-none">+</span> Create
              </button>
              {createOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 z-50 rounded-lg border border-edge bg-surface-2 shadow-2xl py-1 animate-fade-in">
                  {projectId && (
                    <button
                      role="menuitem"
                      onClick={() => { setCreateOpen(false); navigate(`/projects/${projectId}/board?task=new`); }}
                      className="w-full text-left px-3 py-2 text-[13px] text-slate-300 hover:bg-surface-3/70 hover:text-slate-100 transition"
                    >
                      <span className="block font-medium text-slate-200">New task</span>
                      <span className="block text-xs text-slate-500">In the current project</span>
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => { setCreateOpen(false); navigate('/projects?new=1'); }}
                    className="w-full text-left px-3 py-2 text-[13px] text-slate-300 hover:bg-surface-3/70 hover:text-slate-100 transition"
                  >
                    <span className="block font-medium text-slate-200">New project</span>
                    <span className="block text-xs text-slate-500">Start from a blank workspace</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setCreateOpen(false); navigate('/tasks'); }}
                    className="w-full text-left px-3 py-2 text-[13px] text-slate-300 hover:bg-surface-3/70 hover:text-slate-100 transition"
                  >
                    <span className="block font-medium text-slate-200">My tasks</span>
                    <span className="block text-xs text-slate-500">View everything assigned to you</span>
                  </button>
                </div>
              )}
            </div>
            <NotificationBell />
            <Link to="/settings" className="hover:opacity-80">
              <Avatar name={user?.name} avatar={user?.avatar} size={32} />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {paletteOpen && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}