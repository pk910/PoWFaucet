
export function isVersionLower(v1: string, v2: string): boolean {
  if(!v1 || !v2)
    return null;
  let v1parts = v1.split(".");
  let v2parts = v2.split(".");
  let parts = Math.max(v1parts.length, v2parts.length);

  for(let i = 0; i < parts; i++) {
    let v1part = i < v1parts.length ? parseInt(v1parts[i]) : 0;
    let v2part = i < v2parts.length ? parseInt(v2parts[i]) : 0;
    if(v1part < v2part)
      return true;
    else if(v1part > v2part)
      return false;
  }
}
