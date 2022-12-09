
export function base64ToHex(str) {
  const raw = atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += (hex.length === 2 ? hex : '0' + hex);
  }
  return result;
}

export function weiToEth(wei: number|bigint): number {
  if(typeof wei === "number")
    return wei / 1000000000000000000;
  else
    return parseInt(wei.toString()) / 1000000000000000000;
}
