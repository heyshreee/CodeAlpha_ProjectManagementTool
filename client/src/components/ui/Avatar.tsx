import { avatarUrl } from '@/lib/api';

export default function Avatar({
  name,
  avatar,
  size = 32,
}: {
  name?: string;
  avatar?: string | null;
  size?: number;
}) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const src = avatarUrl(avatar);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-edge shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full bg-brand-600/30 text-brand-200 border border-brand-600/40 flex items-center justify-center font-semibold shrink-0"
    >
      {initials}
    </div>
  );
}
