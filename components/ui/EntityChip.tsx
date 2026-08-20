/**
 * 사건에 딸린 공간·인물을 나타내는 알약 모양 표시.
 *
 * 전체 목록과 공간별/인물별 격자가 같은 모양을 쓰도록 여기 모은다.
 * 격자 열은 13rem까지 좁아지므로 이름이 길면 잘라낸다.
 */
export function EntityChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      title={name}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
