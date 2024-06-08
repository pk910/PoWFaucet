
export function joinUrl(base: string, add: string): string {
  let result = (base || "").replace(/\/+$/, "");
  add = add || "";
  if(add.match(/^\//))
    result += add;
  else
    result += "/" + add.replace(/^\/+/, "");
  return result;
}

export function toQuery(params, delimiter = '&'): string {
  const keys = Object.keys(params);

  return keys.reduce((str, key, index) => {
    let query = `${str}${key}=${params[key]}`;

    if (index < (keys.length - 1)) {
      query += delimiter;
    }

    return query;
  }, '');
}
