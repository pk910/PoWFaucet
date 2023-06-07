
export interface IPassportScoreInfo {
  score: number;
  factor: number;
}

export interface IPassportInfo {
  passport: IPassportData;
  score: IPassportScoreInfo;
}

export interface IPassportData {
  found: boolean;
  parsed: number;
  newest: number;
  stamps?: IPassportStampInfo[];
}

export interface IPassportStampInfo {
  provider: string;
  expiration: number;
  duplicate?: string;
}
