
export const getNewGuid = (): string =>  {
    let d = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
}

export const isValidGuid = (guid: string): boolean => {
    if(typeof guid !== "string")
        return false;
    return !!guid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
}

export const getGuidFromString = (str: string): string => {
    const temp = str.replace(/[^0-9a-zA-Z]+/g, "");
    if (temp.length === 32)
        return temp.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    return "";
}