import { access } from "node:fs/promises";

export enum ACCESS_MODE {
  // node:constants R_OK
  READ = 0b100,
  // node:constants W_OK
  WRITE = 0b010,
}

export function fsCanAccess(filepath: URL, accessMode: ACCESS_MODE = ACCESS_MODE.READ): Promise<boolean> {
  return access(filepath, accessMode)
    .then(() => true)
    .catch(() => false);
}
