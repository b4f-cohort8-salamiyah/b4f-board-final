import type { SprintPoints } from '@/lib/types';

export function SprintPointsSummary({ points }: { points: SprintPoints }) {
  if (points.totalPoints === 0) {
    return <p className="text-xs text-gray-400">No estimated issues yet.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span>
        <strong className="text-gray-900 dark:text-gray-100">{points.totalPoints}</strong> total
      </span>
      <span>
        <strong className="text-green-700 dark:text-green-400">{points.completedPoints}</strong>{' '}
        done
      </span>
      <span>
        <strong className="text-gray-900 dark:text-gray-100">{points.remainingPoints}</strong>{' '}
        remaining
      </span>
      <span>{points.completionPercent}% complete</span>
    </div>
  );
}
