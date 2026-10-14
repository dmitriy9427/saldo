import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

// Линтер архитектуры Feature-Sliced Design: слои импортируют только нижние слои,
// у каждого слайса — публичный API (index.ts), никаких «глубоких» импортов.
export default defineConfig([
  ...fsd.configs.recommended,
  {
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
  },
  {
    // «Слайс используется в одном месте — объедините». Для маленького приложения
    // совет верный, но этот проект — учебный пример структуры, которая выдерживает
    // рост: фичи и виджеты разделены нарочно, чтобы показать границы. В рабочем
    // проекте такого размера правило стоит оставить включённым (docs/03-fsd.md).
    rules: { 'fsd/insignificant-slice': 'off' },
  },
])
