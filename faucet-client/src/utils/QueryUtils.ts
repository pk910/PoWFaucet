
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
