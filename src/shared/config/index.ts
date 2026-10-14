/**
 * Адрес API. Абсолютный (с origin): в тестах fetch работает в Node, а там
 * относительный адрес '/api' — ошибка «Failed to parse URL».
 * BASE_URL — '/' локально и '/saldo/' на GitHub Pages (vite.config.ts).
 */
export const API_URL = new URL(`${import.meta.env.BASE_URL}api`, window.location.origin).href.replace(/\/$/, '')

/** Сколько операций на странице списка. */
export const PAGE_SIZE = 30
