import { ConfigFile } from "../../local/config-file.js";
import inputPrompt from "@inquirer/input";
import passwordPrompt from "@inquirer/password";
import { CLIENT } from "../../local/client.js";

export async function login(cwd: URL) {
  const config = await ConfigFile.load(cwd);
  const email = await inputPrompt({
    message: "Email",
  });
  const password = await passwordPrompt({
    message: "Password",
    mask: "*",
  });
  const r = await CLIENT.users.token({ body: { email: email, password: password } });
  if (r.status !== 200) {
    throw new Error(`Can not login`);
  }
  const body = r.body;
  config.content = {
    email: body.email,
    id: body.id,
    exp: new Date(body.exp * 1000),
    token: body.token,
  };
  await config.save();
}
