import { ConfigFile } from "../../local/config-file.js";
import { rm } from "node:fs/promises";

export async function logout(cwd: URL): Promise<void> {
  const config = await ConfigFile.load(cwd);
  if (config.content) {
    await rm(config.filepath);
  }
}
