import process from "node:process";

export function handleSIGINT(onSignal: () => Promise<void>): void {
  let times = 0;
  let shutdownInProgress: Promise<void> | undefined = undefined;
  process.on("SIGINT", () => {
    console.log("Shutting down...");
    times += 1;
    if (times > 2) {
      process.exit(130); // 130 means command terminated due to Ctrl-C being pressed
    }
    if (shutdownInProgress) {
      // If multiple signals received while shutting down
      console.log("Shutting down...\n");
      return;
    }
    shutdownInProgress = onSignal()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  });
}
