// Generate a 6-digit numeric PIN code
export function generatePinCode(): string {
  const pin = Math.floor(100000 + Math.random() * 900000);
  return pin.toString();
}

// Format PIN for display (e.g., "123 456")
export function formatPinCode(pin: string): string {
  if (pin.length !== 6) return pin;
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}
