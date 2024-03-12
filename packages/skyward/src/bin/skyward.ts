import { main } from "../cli/main.js";
import { argv } from "node:process";

main(argv)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
