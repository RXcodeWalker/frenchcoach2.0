import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileQuestion, MessagesSquare, ArrowLeft } from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/questions', label: 'Questions', icon: FileQuestion, end: false },
  { to: '/admin/scenarios', label: 'Scenarios', icon: MessagesSquare, end: false },
];

function Breadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  return (
    <nav className="text-xs text-slate-400 flex items-center gap-1.5">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-600">/</span>}
          <span className={i === parts.length - 1 ? 'text-slate-200 font-semibold' : ''}>{p}</span>
        </span>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-black tracking-tight text-violet-400">Content Admin</span>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive ? 'bg-violet-500/15 text-violet-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
          <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
            <ArrowLeft size={14} /> Back to app
          </Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-3">
        <Breadcrumb />
      </div>
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
