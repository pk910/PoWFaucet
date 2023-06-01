
export function base64ToHex(str) {
  const raw = atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += (hex.length === 2 ? hex : '0' + hex);
  }
  return result;
}

export function toDecimalUnit(amount: number, decimals?: number): number {
  let factor = Math.pow(10, decimals || 18)
  return amount / factor;
}

export function toReadableAmount(amount: number, decimals?: number, unit?: string, precision?: number): string {
  if(!decimals)
    decimals = 18;
  if(!precision) 
    precision = 3;
  
  let decimalAmount = toDecimalUnit(amount, decimals);
  let precisionFactor = Math.pow(10, precision);
  let amountStr = (Math.round(decimalAmount * precisionFactor) / precisionFactor).toString();

  return amountStr + (unit ? " " + unit : "");
}
