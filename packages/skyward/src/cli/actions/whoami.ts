import { ConfigFile } from "../../local/config-file.js";

export async function whoami(cwd: URL) {
  const config = await ConfigFile.load(cwd);
  const content = config.content;
  if (!content) {
    console.log("NOT LOGGED IN");
    process.exit(1);
  }
  console.log(content.email);
}
