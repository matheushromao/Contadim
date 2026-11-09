import clsx from 'clsx';
import { Tag } from 'lucide-react';

import { CATEGORY_ICONS } from './category-icons';

export function CategoryIcon({
  icon,
  color,
  size = 'md',
}: {
  icon: string;
  color: string;
  size?: 'sm' | 'md';
}) {
  const Icon = CATEGORY_ICONS[icon] ?? Tag;
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' ? 'size-8' : 'size-10',
      )}
      style={{ backgroundColor: `${color}22`, color }}
      aria-hidden="true"
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} />
    </span>
  );
}
