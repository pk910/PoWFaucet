
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

export function strFormatPlaceholder(format: string, ..._) {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};
