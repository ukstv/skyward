import InTimeWorker from "./workers/in-time-worker.js?worker";
import PrecacheWorker from "./workers/precache-worker.ts?worker";
import { wrap } from "comlink";
import type { CompileTimer } from "./workers/compile-timer.js";
import React, { useEffect, useMemo, useReducer, useState } from "react";

type LogEvent =
  | {
      kind: "worker-download-started";
    }
  | {
      kind: "worker-download-finished";
      time: number;
    }
  | {
      kind: "compilation-started";
    }
  | {
      kind: "compilation-finished";
      time: number;
    };

function BenchmarkingBlock(
  props: React.PropsWithChildren<{ workerFactory: () => Worker; onEvent: (event: LogEvent) => void }>,
) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const workerDownloadStarted = Date.now();
    props.onEvent({
      kind: "worker-download-started",
    });
    const worker = props.workerFactory();
    try {
      const proxy = wrap<CompileTimer>(worker);
      await new Promise<void>((resolve) => {
        worker.addEventListener("message", (m) => {
          if (m.data === "ready") resolve();
        });
      });
      props.onEvent({
        kind: "worker-download-finished",
        time: Date.now() - workerDownloadStarted,
      });
      props.onEvent({
        kind: "compilation-started",
      });
      const compileTimeMs = await proxy.compile();
      props.onEvent({
        kind: "compilation-finished",
        time: compileTimeMs,
      });
    } catch (e) {
      console.error(e);
    } finally {
      worker.terminate();
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button disabled={true} className={"waiting"} onClick={handleClick}>
        Runnning...
      </button>
    );
  } else {
    return <button onClick={handleClick}>Run</button>;
  }
}

type ComparisonState = {
  worker: number;
  compilation: number;
  event: LogEvent["kind"] | undefined;
};

function comparisonReducer(state: ComparisonState, event: LogEvent): ComparisonState {
  switch (event.kind) {
    case "worker-download-started": {
      return {
        worker: 0,
        compilation: 0,
        event: event.kind,
      };
    }
    case "worker-download-finished": {
      return {
        worker: event.time,
        compilation: 0,
        event: event.kind,
      };
    }
    case "compilation-started": {
      return {
        worker: state.worker,
        compilation: 0,
        event: event.kind,
      };
    }
    case "compilation-finished": {
      return {
        worker: state.worker,
        compilation: event.time,
        event: event.kind,
      };
    }
  }
}

function humanTime(ms: number) {
  if (ms < 800) {
    return (
      <>
        <code>{`<1`}</code> s
      </>
    );
  } else {
    const round = Math.round(ms / 1000);
    return (
      <>
        <code>{round}</code> s
      </>
    );
  }
}

function ComparisonInTime(props: React.PropsWithChildren<{ onDone: (totalTime: number) => void }>) {
  const [r, dispatch] = useReducer(comparisonReducer, {
    worker: 0,
    compilation: 0,
    event: undefined,
  });

  useEffect(() => {
    if (r.worker && r.compilation) {
      props.onDone(r.worker + r.compilation);
    } else {
      props.onDone(0);
    }
  }, [r]);

  const handleEvent = (event: LogEvent) => {
    dispatch(event);
  };

  const renderStats = () => {
    switch (r.event) {
      case "worker-download-started": {
        return (
          <>
            <p className={"progress"}>Downloading worker...</p>
            <p className={"result absent worker"}>&nbsp;</p>
            <p className={"result absent compilation"}>&nbsp;</p>
            <p className={"result absent total"}>&nbsp;</p>
          </>
        );
      }
      case "worker-download-finished": {
        return (
          <>
            <p className={"progress"}>Downloading worker...</p>
            <p className={"result worker"}>Worker downloading: {humanTime(r.worker)}</p>
            <p className={"result absent compilation"}>&nbsp;</p>
            <p className={"result absent total"}>&nbsp;</p>
          </>
        );
      }
      case "compilation-started": {
        return (
          <>
            <p className={"progress"}>Compiling the program...</p>
            <p className={"result worker"}>Worker downloading: {humanTime(r.worker)}</p>
            <p className={"result absent compilation"}>&nbsp;</p>
            <p className={"result absent total"}>&nbsp;</p>
          </>
        );
      }
      case "compilation-finished": {
        return (
          <>
            <p className={"progress"}>&nbsp;</p>
            <p className={"result worker"}>Worker downloading: {humanTime(r.worker)}</p>
            <p className={"result compilation"}>Compilation: {humanTime(r.compilation)}</p>
            <p className={"result total"}>Total: {humanTime(r.compilation + r.worker)}</p>
          </>
        );
      }
      default: {
        return <></>;
      }
    }
  };

  return (
    <div className={"comparison"}>
      <h2>Naïve Compilation</h2>
      <p>
        Compile the program.
        <br />
        &nbsp;
      </p>
      <BenchmarkingBlock workerFactory={() => new InTimeWorker()} onEvent={handleEvent} />
      {renderStats()}
    </div>
  );
}

function ComparisonPrefetch(
  props: React.PropsWithChildren<{ improvementTimes: number | undefined; onDone: (compilationTime: number) => void }>,
) {
  const [r, dispatch] = useReducer(comparisonReducer, {
    worker: 0,
    compilation: 0,
    event: undefined,
  });

  useEffect(() => {
    if (r.worker && r.compilation) {
      props.onDone(r.worker + r.compilation);
    } else {
      props.onDone(0);
    }
  }, [r]);

  const handleEvent = (event: LogEvent) => {
    dispatch(event);
  };

  const renderStats = () => {
    switch (r.event) {
      case "worker-download-started": {
        return (
          <>
            <p className={"progress"}>Downloading worker...</p>
            <p className={"result worker"}>&nbsp;</p>
            <p className={"result compilation"}>&nbsp;</p>
            <p className={"result absent total"}>&nbsp;</p>
          </>
        );
      }
      case "worker-download-finished": {
        return (
          <>
            <p className={"progress"}>Downloading worker...</p>
            <p className={"result available worker"}>Worker downloading: {humanTime(r.worker)}</p>
            <p className={"result compilation"}>&nbsp;</p>
            <p className={"result absent total"}>&nbsp;</p>
          </>
        );
      }
      case "compilation-started": {
        return (
          <>
            <p className={"progress"}>Compiling the program...</p>
            <p className={"result available worker"}>Worker downloading: {humanTime(r.worker)}</p>
            <p className={"result compilation"}>&nbsp;</p>
            <p className={"result absent total"}>&nbsp;</p>
          </>
        );
      }
      case "compilation-finished": {
        return (
          <>
            <p className={"progress"}>&nbsp;</p>
            <p className={"result available worker"}>Worker downloading: {humanTime(r.worker)}</p>
            <p className={"result available compilation"}>Compilation: {humanTime(r.compilation)}</p>
            <p className={"result available total"}>Total: {humanTime(r.compilation + r.worker)}</p>
          </>
        );
      }
      default: {
        return <></>;
      }
    }
  };

  const renderImprovement = () => {
    if (props.improvementTimes === undefined) {
      return <></>;
    }
    const times = Math.round(props.improvementTimes);

    return (
      <div className={"improvement"}>
        <div className={"number"}>{times}x</div>
        <div>faster</div>
      </div>
    );
  };

  return (
    <div className={"comparison"}>
      {renderImprovement()}
      <h2>Pre-caching Enabled</h2>
      <p>
        Prefill ZK program artifacts
        <br />
        and compile the program.
      </p>
      <BenchmarkingBlock workerFactory={() => new PrecacheWorker()} onEvent={handleEvent} />
      {renderStats()}
    </div>
  );
}

export function App() {
  const [inTime, setInTime] = useState<number | undefined>(undefined);
  const [prefetchTime, setPrefetchTime] = useState<number | undefined>(undefined);

  const improvementTimes = useMemo(() => {
    if (inTime && prefetchTime) {
      const roundInTime = Math.round(inTime / 1000);
      const roundPrefetch = Math.round(prefetchTime / 1000);
      return Math.round(roundInTime / roundPrefetch);
    } else {
      return undefined;
    }
  }, [inTime, prefetchTime]);

  return (
    <div className={"body"}>
      <h1 className={"title"}>Speed up your ZK&nbsp;program</h1>
      <div className={"description"}>
        <p>
          Before a O1js program could be run, it has to be compiled first. The compilation could take from tens of
          seconds to <em>a few minutes</em>. Making your users wait leads to churn. We reduce the compilation time to{" "}
          <em>a few seconds</em> by pre-caching O1 artifacts, like prover keys, verification keys, SRS and whatnot.
        </p>
        <p>Compare it yourself.</p>
      </div>
      <div className={"comparison-table"}>
        <ComparisonInTime onDone={setInTime} />
        <div className={"vs"}>vs</div>
        <ComparisonPrefetch improvementTimes={improvementTimes} onDone={setPrefetchTime} />
      </div>
      <h2>Why</h2>
      <div className={"description-left"}>
        <p>
          You want to give your users a superb experience. ZK programs are notoriously slow, even before you actually
          can use it. At best it is annoying, at worst it leads to customers churn. There is a simple way to speed up an
          application: pre-cache build artifacts, like prover keys, verification keys, and SRS. You could do it
          manually, but this is too cumbersome. As an attempt to reduce developer complexity, we have Skyward - one
          toolkit to improve user experience by drastically decreasing ZK program compilation time.
        </p>
      </div>
      <h2>How</h2>
      <div className={"description-left"}>
        <ol className={"usage-steps"}>
          <li>
            <strong>
              Add <code>skyward</code> library to your app.
            </strong>{" "}
            Here we use <code>npm</code>, but <code>pnpm</code> or <code>yarn</code> are just fine.
            <pre>
              <code>npm add skyward</code>
            </pre>
          </li>
          <li>
            <strong>Make a script to compile your program.</strong> Let's assume you have O1JS ZK program{" "}
            <code>HelloProgram</code> living at <code>/src/hello-program.ts</code> in your project:
            <pre>
              <code>
                {'import { Bool, Field, ZkProgram } from "o1js";\n' +
                  "\n" +
                  "export const HelloProgram = ZkProgram({\n" +
                  '  name: "hello-program",\n' +
                  "  publicInput: Field,\n" +
                  "  publicOutput: Bool,\n" +
                  "  methods: {\n" +
                  "    addition: {\n" +
                  "      privateInputs: [Field, Field],\n" +
                  "      method(sum, a, b) {\n" +
                  "        return a.add(b).equals(sum);\n" +
                  "      },\n" +
                  "    },\n" +
                  "  },\n" +
                  "});\n"}
              </code>
            </pre>
            Create a file at <code>/scripts/compile.ts</code> with the following content:
            <pre>
              <code>
                {'import { prepare } from "skyward/prepare";\n' +
                  'import { HelloProgram } from "../src/hello-program.js";\n' +
                  "await prepare(HelloProgram)"}
              </code>
            </pre>
          </li>
          <li>
            <strong>Compile the program and create O1JS artifacts.</strong> When you run the script above, it creates
            the artifacts on disk. <code>skyward</code> keeps track of them to use later. To run the script you might
            use a runner like{" "}
            <a href={"https://www.npmjs.com/package/tsx"}>
              <code>tsx</code>
            </a>{" "}
            or{" "}
            <a href={"https://www.npmjs.com/package/tsm"}>
              <code>tsm</code>
            </a>
            . With <code>tsx</code> you run the script as
            <pre>
              <code>tsx ./scripts/compile.ts</code>
            </pre>
            You might want to add that to <code>scripts</code> section of <code>package.json</code>.
          </li>
          <li>
            <strong>Create a skyward account.</strong> We will upload the artifacts to the cloud. To make sure a
            malicious user does not interfere with <em>your</em> ZK program artifacts, we ask you to create a user
            account. It requires an email and a password of your choosing. Run the following command on console, and
            follow a prompt there:
            <pre>
              <code>npx skyward adduser</code>
            </pre>
          </li>
          <li>
            <strong>Upload the artifacts.</strong> Now we can upload the artifacts. <code>skyward</code> creates a
            manifest JSON file on your disk to pre-cache the artifacts needed for your program. We'll show how to use it
            later. For now, let's store the manifest in <code>/src/data/</code> folder, as{" "}
            <code>/src/data/skyward.json</code>. Run the following command on console:
            <pre>
              <code>npx skyward upload ./src/data/</code>
            </pre>
          </li>
          <li>
            <strong>Use ZK program in browser.</strong> Let's assume you have figured out how to run O1JS ZK programs on
            web. You use a <a href={"https://developer.mozilla.org/en-US/docs/Web/API/Worker"}>Worker</a> to offload
            compute-heavy part of ZK operations. This way your webapp remains responsive even while doing proving or
            program compilation.
            <br />
            Slow vanilla worker living in <code>/src/workers/</code> folder could look like this:
            <pre>
              <code>
                {'import { HelloProgram } from "../hello-program.js";\n' +
                  'import { expose } from "comlink";\n' +
                  "\n" +
                  "const functions = {\n" +
                  "  async compile() {\n" +
                  "    await HelloProgram.compile();\n" +
                  "  },\n" +
                  "};\n" +
                  "\n" +
                  "expose(functions);\n"}
              </code>
            </pre>
            You should add here just few lines to speed it up by pre-caching:
            <pre>
              <code>
                {'import { HelloProgram } from "../hello-program.js";\n' + 'import { expose } from "comlink";\n'}
                <strong>
                  {'import { RemoteCache, decode, ManifestContent } from "skyward/browser";\n' +
                    'import * as manifestJSON from "../data/skyward.json";\n\n' +
                    "// Instantiate a cache from the manifest file\n" +
                    "const cache = RemoteCache.fromManifest(decode(ManifestContent, manifestJSON));\n" +
                    "// Promise that resolves when we are done pre-caching the artifacts\n" +
                    "const precacheP = cache.populate(HelloProgram.name);\n" +
                    "\n"}
                </strong>
                {"const functions = {\n" + "  async compile() {\n"}
                <strong>{"    await precacheP;\n"}</strong>
                {"    await HelloProgram.compile("}
                <strong>{"{ cache: cache }"}</strong>
                {");\n" + "  },\n" + "};\n" + "\n" + "expose(functions);\n"}
              </code>
            </pre>
          </li>
          <li>
            <strong>Enjoy the faster ZK program.</strong>Pre-caching makes compilation time up to 10x faster, which
            means your users do not churn out. The artifacts are downloaded via fast Google CDN. After the initial
            download the artifacts are cached in a browser, so that the returning users have little to no waiting time
            during a program compilation.
          </li>
        </ol>
      </div>
      <div className={"description-left footer"}>
        <p>
          You could learn more of available features on the project's{" "}
          <a href={"https://github.com/ukstv/skyward"}>GitHub</a>.
        </p>
      </div>
    </div>
  );
}
