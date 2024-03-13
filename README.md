# Skyward

Skyward reduces compilation time of a O1JS ZK program on Web.

Skyward allows you to pre-cache artifacts like prover keys, verification keys, SRS, and so on.
With that ZK program compilation takes just a few seconds.

Check out the demo at [https://skyward.run](https://skyward.run). The code for it is in [examples/example-vite](./examples/example-vite) folder.

You could see pre-cached compilation is 4-5x faster. After you refresh the page, the improvement is about 15x, which is considerable for a repeat user.
More complex ZK program you have, more the difference is.

## Installation

Add `skyward` as a dependency using `npm`, `pnpm` or `yarn`:

```shell
npm add skyward
```

## Usage

Before the artifacts can be used for pre-caching, they have to be made available on the Web.

### 1. Compiling the program and preparing the artifacts locally

Create a script that prepares the artifacts. Let's say you compile `HelloProgram`:

```typescript
// scripts/compile.ts
import { prepare } from "skyward/prepare";
import { HelloProgram } from "../src/hello-program.js";

await prepare(HelloProgram);
```

Run it, for example using [tsx](https://www.npmjs.com/package/tsx):

```shell
tsx scripts/compile.ts
```

That would make the artifacts known for `skyward`. You could see that if you list the known programs:

```shell
npx skyward list
```

For `example-vite` and `HelloProgram` it outputs:

```shell
┌───────────────┬──────────────────────────────────────────────┬───────┬──────────┐
│ Name          │ Hash                                         │ Files │ Size     │
├───────────────┼──────────────────────────────────────────────┼───────┼──────────┤
│ hello-program │ uJS7R9Qnl78lcuvLU7yVsZaAVYD_otIMyBjj8G2XV42I │ 10    │ 15.97 MB │
└───────────────┴──────────────────────────────────────────────┴───────┴──────────┘
```

### 2. Create skyward account

You should create an account to upload the artifacts on skyward cloud. See [Cloud](#cloud) section for rationale.

```shell
npx skyward login
```

### 3. Upload the artifacts

After the artifacts are uploaded, skyward will create a JSON manifest file `skyward.json`.
It is used to pre-cache all the necessary artifacts for a program when in browser.

We expect the file to be located in `src/data/skyward.json`. We pass the folder to the command:

```shell
npx skyward upload src/data
```

If you have multiple programs, and you intend to upload just specific programs:

```shell
npx skyward upload src/data -p program1 -p program2
```

### 4. Use ZK program in a browser

Now you should tell O1JS to use a pre-populated cache. Let's assume you have a vanilla code like this:

```typescript
import { HelloProgram } from "../hello-program.js";
import { expose } from "comlink";

const functions = {
  async compile() {
    await HelloProgram.compile();
  },
};

expose(functions);
```

It should be changed to look like this:

```typescript
import { HelloProgram } from "../hello-program.js";
import { expose } from "comlink";
import { RemoteCache, decode, ManifestContent } from "skyward/browser";
import * as manifestJSON from "../data/skyward.json";

// Instantiate a cache from the manifest file
const cache = RemoteCache.fromManifest(decode(ManifestContent, manifestJSON));
// Promise that resolves when we are done pre-caching the artifacts
const precacheP = cache.populate(HelloProgram.name);

const functions = {
  async compile() {
    await precacheP;
    await HelloProgram.compile({ cache: cache });
  },
};

expose(functions);
```

See, we pass our custom `cache` to `HelloProgram.compile`.
The cache gets pre-populated by the artifacts listed in `manifestJSON` you created on a previous step.
To ensure it has all the artifacts, we wait (`await precacheP`) until the pre-caching is done.

## Cloud

You could host the artifacts along with the rest of _your_ webapp bundle.
It means though, you have to build them before the bundling, or store them in a repository. Or, you could use your own blob storage - Amazon S3, GCP Storage, Vercel Blobs, etc.
We found it to be quite inconvenient: manage automation, proper caching, getting big repos, manage HTTP headers.
We decided to make the experience more comfortable.

## Commands

You could see all the commands available running

```shell
npx skyward --help
```

- `adduser` - Add a user account, asks for email and password
- `login` - Login to the account, asks for email and password
- `logout` - Clear locally stored access token for the logged in user
- `whoami` - Show an email of a user currently logged in
- `list` - List known ZK programs of the project
- `upload` - Upload ZK program artifacts to the cloud
- `serve` - Serve program artifacts over HTTP locally, uses port 4040 by default
- `extract` - Similar to upload, but copies the artifacts to the target folder

The last two commands are worth describing in more detail.

**`serve`:** During local development, you might want to avoid cloud. You might consume locally-served artifacts.
We could adapt our familiar `HelloProgram` example by changing `cache` variable:

```typescript
// Instantiate a cache from the manifest file served at http://localhost:4040/skyward.json
// This is default by `skyward serve`
const cache = RemoteCache.fromManifestURL();
```

**`extract`:** Useful in case you want to host the artifacts by yourself. It generates a manifest JSON file same as `upload`,
and copies the artifacts to the destination folder of your choosing.

```shell
npx skyward extract src/data
```

That would create the artifacts at `src/data` folder, and `src/data/skyward.json` manifest file that references those.
The manifest file could be used as shown above.

## Maintainers

[@ukstv](https://github.com/ukstv)

## Contributing

Feel free to dive in! [Open an issue](https://github.com/ukstv/skyward/issues/new), submit PRs, ask questions, make suggestions.

## License

[MIT](https://opensource.org/license/MIT) OR [Apache-2.0](https://opensource.org/license/apache-2-0)
