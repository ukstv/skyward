import { fsCanAccess } from "./fs-can-access.js";
import { currentWorkingDir } from "./current-working-dir.js";

export class NoPackageFolderError extends Error {
  constructor(cwd: URL) {
    super(`package.json not found in ${cwd.href} and its ancestors`);
  }
}

export async function nearestPackageFolder(cwd: URL = currentWorkingDir()): Promise<URL> {
  let dir = cwd;
  let prevDir = dir;
  do {
    const path = new URL("./package.json", dir);
    const isPresent = await fsCanAccess(path);
    if (isPresent) {
      return dir;
    } else {
      prevDir = dir;
      dir = new URL("../", dir);
    }
  } while (prevDir !== dir);
  throw new NoPackageFolderError(cwd);
}
