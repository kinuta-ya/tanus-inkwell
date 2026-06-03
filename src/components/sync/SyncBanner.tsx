import { useRepositoryStore } from '../../stores/repositoryStore';

/**
 * App-wide banner shown while one or more repositories are fetching their
 * Markdown from GitHub. The fetch runs in the background (in the store), so
 * this banner is rendered at the app root and stays visible on any page. The
 * scrolling message reminds the user to only browse — not edit — while the
 * fetch may overwrite local files.
 */
export const SyncBanner = () => {
  const syncingRepoIds = useRepositoryStore((s) => s.syncingRepoIds);
  const repositories = useRepositoryStore((s) => s.repositories);

  if (syncingRepoIds.length === 0) return null;

  const names = syncingRepoIds
    .map((id) => repositories.find((r) => r.id === id)?.name ?? id)
    .join('、');

  const message = `📡 ${names} を取得中です。編集はせずに閲覧だけにしてください。`;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-sm font-medium shadow-md overflow-hidden">
      <div className="whitespace-nowrap py-1.5 animate-[marquee_12s_linear_infinite] will-change-transform">
        {/* Repeated so the ticker text is continuous across the gap. */}
        <span className="px-8">{message}</span>
        <span className="px-8">{message}</span>
      </div>
    </div>
  );
};
