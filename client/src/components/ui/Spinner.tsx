export default function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="inline-block border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin"
    />
  );
}
