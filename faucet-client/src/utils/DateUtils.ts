
function padLeft(str: any, len: number, pad: string): string {
  str = str.toString();
  while(str.length < len)
    str = pad + str;
  return str;
}

export const renderDate = (date: Date, withTime?: boolean): string => {
  return date.getFullYear() + "-" + padLeft(date.getMonth() + 1, 2, '0') + '-' + padLeft(date.getDate(), 2, '0') +
    (withTime ? " " + padLeft(date.getHours(), 2, '0') + ":" + padLeft(date.getMinutes(), 2, '0') : "")
}

export const renderTime = (date: Date, withSec?: boolean): string => {
  return padLeft(date.getHours(), 2, '0') + ":" + padLeft(date.getMinutes(), 2, '0') + (withSec ? ":" + padLeft(date.getSeconds(), 2, '0') : "");
}

export const renderTimespan = (time: number, maxParts?: number): string => {
  let resParts: string[] = [];
  let group: number;
  if(!maxParts)
    maxParts = 2;
  
  group = 60 * 60 * 24;
  if(time >= group) {
    let groupVal = Math.floor(time / group);
    time -= groupVal * group;
    resParts.push(groupVal + "d");
  }

  group = 60 * 60;
  if(time >= group) {
    let groupVal = Math.floor(time / group);
    time -= groupVal * group;
    resParts.push(groupVal + "h");
  }

  group = 60;
  if(time >= group) {
    let groupVal = Math.floor(time / group);
    time -= groupVal * group;
    resParts.push(groupVal + "min");
  }

  group = 1;
  if(time >= group) {
    let groupVal = Math.floor(time / group);
    time -= groupVal * group;
    resParts.push(groupVal + "sec");
  }

  if(resParts.length > maxParts) {
    resParts = resParts.slice(0, maxParts);
  }
  return resParts.join(" ");
}
