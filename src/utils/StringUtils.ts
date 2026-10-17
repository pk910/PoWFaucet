
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
  return format.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};

/**
 * Strip every trailing character that is in `chars` from `str`.
 * A loop instead of a `/[chars]+$/` regex: that regex backtracks quadratically on long runs of the
 * stripped characters (CodeQL js/polynomial-redos), this is linear.
 */
export function strTrimEnd(str: string, chars: string): string {
  let end = str.length;
  while(end > 0 && chars.indexOf(str.charAt(end - 1)) !== -1)
    end--;
  return str.substring(0, end);
}
