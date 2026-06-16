const DICE_ICON_BASE_PATH = '/images';

function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export function getDiceSides(diceType) {
  const match = String(diceType || '').match(/\d+/);
  if (!match) return null;
  const sides = Number.parseInt(match[0], 10);
  return Number.isFinite(sides) && sides > 0 ? sides : null;
}

export function getDiceIconUrl(diceType) {
  const sides = getDiceSides(diceType);
  return sides ? `${DICE_ICON_BASE_PATH}/Wuerfel${sides}.png` : '';
}

export function getDiceLabel(diceType) {
  const sides = getDiceSides(diceType);
  return sides ? `D${sides}` : String(diceType || '').toUpperCase();
}

export function renderDiceIcon(diceType, className = 'dice-type-icon') {
  const sides = getDiceSides(diceType);
  if (!sides) return '';
  const label = `D${sides}`;
  return `<img class="${className}" src="${getDiceIconUrl(sides)}" alt="${label}" loading="lazy" decoding="async">`;
}

export function renderDiceType(diceType, className = 'dice-type-with-icon', iconClass = 'dice-type-icon') {
  const label = escHtml(getDiceLabel(diceType));
  return `<span class="${className}">${renderDiceIcon(diceType, iconClass)}<span>${label}</span></span>`;
}
