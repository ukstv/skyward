import type { CompileTimer } from "./compile-timer.js";
import { HelloProgram } from "../hello-program.js";
import { expose } from "comlink";

// We use same interface for in-time worker here and pre-cache-enabled one in `./precache-worker.ts`.
const functions: CompileTimer = {
  async compile(): Promise<number> {
    const before = Date.now();
    await HelloProgram.compile();
    const after = Date.now();
    return after - before;
  },
};

expose(functions);
postMessage("ready");
