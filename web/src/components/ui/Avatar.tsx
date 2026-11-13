const COLORS = [
  'bg-red-200 text-red-800',
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-amber-200 text-amber-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % COLORS.length;
  return COLORS[hash];
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dims = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-9 w-9 text-sm';

  return (
    <span
      title={name}
      className={`inline-flex ${dims} flex-shrink-0 items-center justify-center rounded-full font-semibold ${colorFor(name)}`}
    >
      {initials}
    </span>
  );
}
