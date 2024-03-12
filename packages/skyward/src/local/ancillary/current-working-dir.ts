import { cwd } from "node:process";
import { folderUrl } from "./folder-url.js";

export function currentWorkingDir(): URL {
  return folderUrl(cwd());
}
