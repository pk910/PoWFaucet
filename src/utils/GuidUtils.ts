import crypto from "crypto"

export const getNewGuid = (): string =>  {
    return crypto.randomUUID();
}
