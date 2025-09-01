---
id: 27
phase: 8
title: "Фаза 8: Оптимизация чанков и снижение веса главного бандла"
status: done
created: 2025-09-01
updated: 2025-09-01
filesChanged: 1
---

# Отчёт по фазе 8

## Что сделано
- Настроено разделение бандла через Rollup manualChunks в `apps/qryleth-front/vite.config.ts`:
  - Выделены отдельные чанки: `chunk-three` (three + r3f + postprocessing), `chunk-mantine`, `chunk-langchain`, `chunk-codemirror`, `chunk-react`, `chunk-dexie`, `vendor`, `chunk-router`.
  - Установлен `chunkSizeWarningLimit: 2000` для релевантного порога предупреждений.

## Результаты сборки
- Основной чанк приложения ~437 кБ (gzip ~123 кБ), крупные зависимости вынесены в отдельные чанки.
- Сборка проходит успешно; предупреждения сведены к информативным.

