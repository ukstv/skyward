import { fsCanAccess } from "./ancillary/fs-can-access.js";
import { type, string, decode, type TypeOf } from "codeco";
import { readFile, writeFile } from "node:fs/promises";
import { dateString } from "../shared/codecs.js";

function homedir(): URL {
  const envName = process.platform === "win32" ? "USERPROFILE" : "HOME";
  const base = process.env[envName];
  const href = `file://${base}/`.replace(/\/\/$/, "/");
  return new URL(href);
}

async function configFilePath(cwd: URL): Promise<[URL, boolean]> {
  const local = new URL(`./.skyward.config.json`, cwd);
  const isLocal = await fsCanAccess(local);
  if (isLocal) {
    return [local, true];
  }
  const global = new URL(`./.skyward.config.json`, homedir());
  const isGlobal = await fsCanAccess(global);
  if (isGlobal) {
    return [global, true];
  } else {
    return [global, false];
  }
}

export const ConfigFileContent = type({
  token: string,
  id: string,
  email: string,
  exp: dateString,
});
export type ConfigFileContent = TypeOf<typeof ConfigFileContent>;

export class ConfigFile {
  #content: ConfigFileContent | undefined;

  static async load(cwd: URL) {
    const [filepath, isPresent] = await configFilePath(cwd);
    if (isPresent) {
      const contentString = await readFile(filepath, "utf8");
      const contentJSON = JSON.parse(contentString);
      const content = decode(ConfigFileContent, contentJSON);
      return new ConfigFile(filepath, content);
    } else {
      return new ConfigFile(filepath, undefined);
    }
  }

  constructor(
    readonly filepath: URL,
    content: ConfigFileContent | undefined,
  ) {
    this.#content = content;
  }

  get content(): ConfigFileContent | undefined {
    return this.#content;
  }

  set content(value: ConfigFileContent) {
    this.#content = value;
  }

  async save() {
    if (!this.#content) return;
    const contentJSON = ConfigFileContent.encode(this.#content);
    const contentString = JSON.stringify(contentJSON, null, 2);
    await writeFile(this.filepath, contentString, "utf8");
  }
}
