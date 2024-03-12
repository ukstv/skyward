import { RemoteCache } from "./browser/remote-cache.js";
import { HelloProgram } from "./__tests__/hello-program.js";
import { prepare } from "./prepare.js";

const remote = RemoteCache.fromManifestURL();

// Local FS cache: ~0.8s
// No cache: 12s
// Remote cache: ~1.4s

// console.time("compile");
// await prepare(HelloProgram);
// console.timeEnd("compile");

console.time("compile+populate");
console.time("pop");
await remote.populate(HelloProgram.name);
console.timeEnd("pop");
await HelloProgram.compile({ cache: remote });
console.timeEnd("compile+populate");
