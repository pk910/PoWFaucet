import { strPadLeft } from "./StringUtils";


export const renderDate = (date: Date, withTime?: boolean, withSec?: boolean): string => {
  return date.getFullYear() + "-" + strPadLeft(date.getMonth() + 1, 2, '0') + '-' + strPadLeft(date.getDate(), 2, '0') +
    (withTime ? " " + strPadLeft(date.getHours(), 2, '0') + ":" + strPadLeft(date.getMinutes(), 2, '0') + (withSec ? ":" + strPadLeft(date.getSeconds(), 2, '0') : "") : "")
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
