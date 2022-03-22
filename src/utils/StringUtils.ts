
export function strPadLeft(str: any, len: number, pad: string): string {
  str = str.toString();
  while(str.length < len)
    str = pad + str;
  return str;
}

export function strPadRight(str: any, len: number, pad: string): string {
  str = str.toString();
  while(str.length < len)
    str += pad;
  return str;
}
