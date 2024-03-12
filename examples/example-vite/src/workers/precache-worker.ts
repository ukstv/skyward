import { RemoteCache, decode, ManifestContent } from "skyward/browser";
import type { CompileTimer } from "./compile-timer.js";
import { HelloProgram } from "../hello-program.js";
import { expose } from "comlink";
import * as manifestJSON from "../data/skyward.json";

const cache = RemoteCache.fromManifest(decode(ManifestContent, manifestJSON));

// Promise that resolves when we are done pre-caching the artifacts
const precacheP = cache.populate(HelloProgram.name);

// We use same interface for a pre-cache-enabled worker here and in-time worker in `./in-time-worker.ts`.
const functions: CompileTimer = {
  async compile(): Promise<number> {
    const before = Date.now();
    await precacheP;
    await HelloProgram.compile({ cache: cache });
    const after = Date.now();
    return after - before;
  },
};

expose(functions);
postMessage("ready");
