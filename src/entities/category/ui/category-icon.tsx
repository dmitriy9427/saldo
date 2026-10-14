import {
  Briefcase,
  Bus,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  type LucideIcon,
  Percent,
  Plane,
  Shirt,
  ShoppingCart,
  Tag,
  Ticket,
  Tv,
  Wifi,
} from 'lucide-react'
import type { CSSProperties } from 'react'

import type { Category } from '@/shared/api'

import s from './category-icon.module.scss'

// Явный словарь, а не `import * as icons`: в сборку попадут только эти 16 иконок,
// а не все полторы тысячи из lucide.
const ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  coffee: Coffee,
  bus: Bus,
  house: House,
  wifi: Wifi,
  tv: Tv,
  'heart-pulse': HeartPulse,
  shirt: Shirt,
  ticket: Ticket,
  plane: Plane,
  gift: Gift,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  laptop: Laptop,
  percent: Percent,
}

interface CategoryIconProps {
  category: Pick<Category, 'icon' | 'color'> | undefined
  size?: 'sm' | 'md'
}

/** Иконка категории в цветном кружке. Цвет — из данных, через CSS-переменную. */
export function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const Icon = (category && ICONS[category.icon]) || Tag
  return (
    <span className={`${s.icon} ${s[size]}`} style={{ '--c': category?.color ?? 'var(--muted)' } as CSSProperties} aria-hidden>
      <Icon />
    </span>
  )
}
