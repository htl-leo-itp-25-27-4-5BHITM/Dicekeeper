export const MAX_PLAYER_COUNT_ERROR = 'Die maximale Spieleranzahl muss mindestens 1 sein.';

export function readMaxPlayerCount(input) {
  const rawValue = input.value.trim();
  const value = rawValue === '' ? null : Number(rawValue);
  const valid = !input.validity.badInput
    && (value === null || (Number.isInteger(value) && value >= 1));
  const message = valid ? '' : MAX_PLAYER_COUNT_ERROR;

  input.setCustomValidity(message);
  input.setAttribute('aria-invalid', valid ? 'false' : 'true');

  return { valid, value: valid ? value : null, message };
}

export function bindMaxPlayerCountValidation(input, errorElement, onChange = () => {}) {
  const validate = () => {
    const result = readMaxPlayerCount(input);
    if (errorElement) {
      errorElement.textContent = result.message;
      errorElement.style.display = result.valid ? 'none' : 'block';
    }
    onChange(result);
    return result;
  };

  input.addEventListener('input', validate);
  return validate;
}
