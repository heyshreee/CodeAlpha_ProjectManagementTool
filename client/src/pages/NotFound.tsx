import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <h1 className="text-3xl font-bold text-slate-200 mb-2">404</h1>
      <p className="mb-4">Page not found</p>
      <Link to="/" className="text-brand-400 hover:text-brand-300">Back to dashboard</Link>
    </div>
  );
}