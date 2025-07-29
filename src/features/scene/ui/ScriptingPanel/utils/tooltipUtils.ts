import { TOOLTIP_BASE_STYLES, STYLED_TOOLTIP_BASE } from '../constants/tooltipStyles'

export const createTooltipDOM = (content: string, styles = TOOLTIP_BASE_STYLES) => {
  const div = document.createElement('div')
  Object.assign(div.style, styles)
  div.textContent = content
  return { dom: div }
}

export const createStyledTooltip = (text: string) => {
  return () => {
    const div = document.createElement('div')
    Object.assign(div.style, STYLED_TOOLTIP_BASE)

    const lines = text.split('\n')
    let html = ''
    lines.forEach(line => {
      if (line.trim() === '') return
      if (line.includes('():')) {
        html += `<h3 style="margin: 0 0 8px 0; color: #4ec9b0;">${line}</h3>`
      } else if (line.startsWith('Возвращает:')) {
        html += `<p style="margin: 4px 0; color: #dcdcaa;"><strong>${line}</strong></p>`
      } else if (line.startsWith('Параметры:')) {
        html += `<p style="margin: 4px 0; color: #dcdcaa;"><strong>${line}</strong></p>`
      } else if (line.startsWith('Описание:')) {
        html += `<p style="margin: 8px 0 0 0; color: #9cdcfe;">${line}</p>`
      } else {
        html += `<pre style="margin: 0; color: #d4d4d4;">${line}</pre>`
      }
    })

    div.innerHTML = html
    return div
  }
}

export const createHoverTooltip = (content: string, from: number, to: number) => {
  return {
    pos: from,
    end: to,
    above: true,
    create: () => {
      const div = document.createElement('div')
      Object.assign(div.style, TOOLTIP_BASE_STYLES)
      div.textContent = content
      return { dom: div }
    }
  }
}