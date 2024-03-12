import { ConfigFile } from "../../local/config-file.js";
import inputPrompt from "@inquirer/input";
import passwordPrompt from "@inquirer/password";
import { CLIENT } from "../../local/client.js";

export async function adduser(cwd: URL) {
  const config = await ConfigFile.load(cwd);
  const email = await inputPrompt({
    message: "Email",
  });
  let passwordConfirmed: string | undefined = undefined;
  do {
    const password = await passwordPrompt({
      message: "Password",
      mask: "*",
    });
    const passwordConfirmation = await passwordPrompt({
      message: "Password confirmation",
      mask: "*",
    });
    if (passwordConfirmation === password) {
      passwordConfirmed = password;
    }
  } while (!Boolean(passwordConfirmed));
  if (!passwordConfirmed) throw new Error(`Incorrect password`);
  const r = await CLIENT.users.add({ body: { email: email, password: passwordConfirmed } });
  if (r.status !== 201) {
    throw new Error(`Can not create user`);
  }
  const body = r.body;
  config.content = {
    email: body.email,
    id: body.id,
    exp: new Date(body.exp * 1000),
    token: body.token,
  };
  await config.save();
  console.log(`Logged in as ${body.email}`);
}
