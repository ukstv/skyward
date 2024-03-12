import sade from "sade";
import { version } from "../version.js";
import { Actioneer } from "./actioneer.js";
import { nearestPackageFolder } from "../local/ancillary/nearest-package-folder.js";
import { list } from "./actions/list.js";
import cacheDir from "cachedir";
import { extract } from "./actions/extract.js";
import { resolve } from "node:path";
import { folderUrl } from "../local/ancillary/folder-url.js";
import { serve } from "./actions/serve.js";
import { adduser } from "./actions/adduser.js";
import { login } from "./actions/login.js";
import { currentWorkingDir } from "../local/ancillary/current-working-dir.js";
import { logout } from "./actions/logout.js";
import { whoami } from "./actions/whoami.js";
import { upload } from "./actions/upload.js";

export async function main(argv: Array<string>) {
  const actioneer = new Actioneer();
  const program = sade("skyward").version(version);
  const packageFolder = await nearestPackageFolder();
  const cacheFolder = folderUrl(cacheDir("o1js"));
  const cwd = currentWorkingDir();

  program
    .command("adduser", "Add a user account", {
      alias: ["add-user", "signup", "sign-up"],
    })
    .action(actioneer.run(() => adduser(cwd)))

    .command("login", "Login to a user account", {
      alias: ["signin", "sign-in"],
    })
    .action(actioneer.run(() => login(cwd)))

    .command("logout", "Log out")
    .action(actioneer.run(() => logout(cwd)))

    .command("whoami", "Display registered email")
    .action(actioneer.run(() => whoami(cwd)))

    .command("list", "List available programs with artifacts to extract", {
      alias: ["ls"],
    })
    .action(actioneer.run(() => list(packageFolder)));

  program
    .command("extract <folder>", "Extract the artifacts to the folder", {
      alias: ["x"],
    })
    .option("--program, -p", "Name or hash of the program to extract; absent means all programs")
    .action(
      actioneer.run(async (folder: string, options: Partial<{ program?: string | Array<string> }>) => {
        const program = options.program ? Array.from([options.program]).flat().filter(Boolean) : undefined;
        const outFolder = folderUrl(resolve(folder));
        await extract({
          cacheFolder: cacheFolder,
          packageFolder: packageFolder,
          outFolder: outFolder,
          program: program,
        });
      }),
    );

  program
    .command("upload <folder>", "Upload artifacts and put manifest to the folder", {
      alias: ["u"],
    })
    .option("--program, -p", "Name or hash of the program to extract; absent means all programs")
    .action(
      actioneer.run(async (folder: string, options: Partial<{ program: string | Array<string> }>) => {
        const program = options.program ? Array.from([options.program]).flat().filter(Boolean) : undefined;
        const outFolder = folderUrl(resolve(folder));
        await upload({
          cacheFolder: cacheFolder,
          packageFolder: packageFolder,
          outFolder: outFolder,
          program: program,
          cwd: cwd,
        });
      }),
    );

  program
    .command("serve", "Serve the artifacts via HTTP", {
      alias: ["s"],
    })
    .option("--port, -p", "Port to listen to", 4040)
    .action(
      actioneer.run(async (options) => {
        await serve(options.port, packageFolder, cacheFolder);
      }),
    );

  program.parse(argv);

  await actioneer;
}
