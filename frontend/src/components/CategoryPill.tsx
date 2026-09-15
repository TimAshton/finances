import type { Category } from '../types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/format'

export default function CategoryPill({ category }: { category: Category }) {
  return (
    <span className="pill" style={{ background: CATEGORY_COLORS[category] }}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}
