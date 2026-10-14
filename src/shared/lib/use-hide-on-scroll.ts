import { useEffect, useState } from 'react'

/**
 * Спрятать при прокрутке вниз, показать при прокрутке вверх — как нижнее меню
 * в мобильных приложениях. Возвращает true, когда элемент должен уехать.
 *
 * - порог `threshold` px: дрожание пальца и «резинка» iOS не дёргают меню;
 * - у верха страницы (`top` px) меню видно всегда;
 * - у самого низа — тоже: иначе последние строки нечем «вернуть»;
 * - чтение scrollY — в requestAnimationFrame: не чаще кадра, без лишних рендеров.
 */
export function useHideOnScroll({ threshold = 8, top = 64 } = {}) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    function update() {
      frame = 0
      // «Резинка» iOS даёт отрицательную прокрутку и прокрутку ниже конца — обрезаем.
      const max = document.documentElement.scrollHeight - window.innerHeight
      const y = Math.min(Math.max(window.scrollY, 0), max)
      const delta = y - last
      if (y < top || y >= max - 2) setHidden(false)
      else if (Math.abs(delta) < threshold) return
      else setHidden(delta > 0)
      last = y
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [threshold, top])

  return hidden
}
