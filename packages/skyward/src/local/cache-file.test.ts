import { test } from "uvu";
import * as assert from "uvu/assert";
import { CacheFile, CacheFileContent, InvalidCacheFileError } from "./cache-file.js";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dir } from "tmp-promise";
import { Field } from "o1js";

const FAUX_PROGRAM_CONTENT = {
  name: "hello",
  verificationKey: {
    data: "string",
    hash: Field(1),
  },
  files: {
    a: {
      href: new URL("file:///absent.file"),
      size: 0,
      dataType: "string",
    },
  },
} as const;

test("filepath", () => {
  const folder = new URL("file:///long/folder/path");
  const filepath = CacheFile.filepath(folder);
  assert.equal(filepath.href, new URL("./node_modules/.skyward/cache-file.json", folder).href);
});

test("load: no file: return empty", async () => {
  const filepath = new URL(`./absent.json`, import.meta.url);
  const cacheFile = await CacheFile.load(filepath);
  assert.equal(cacheFile.filepath, filepath);
  assert.equal(cacheFile.content, {
    version: "1",
    programs: {},
  });
});

test("load: invalid file", async () => {
  const dirHandler = await dir({ unsafeCleanup: true });
  const tmpFolder = new URL(`file://${dirHandler.path}/`);
  const invalidJSON = JSON.stringify({ hello: "world" });
  const cacheFilepath = new URL("./invalid.json", tmpFolder);
  await writeFile(cacheFilepath, invalidJSON, "utf8");
  try {
    await CacheFile.load(cacheFilepath);
    assert.unreachable();
  } catch (e) {
    assert.ok(e instanceof InvalidCacheFileError);
  }
  await dirHandler.cleanup();
});

test("load: ok", async () => {
  const filepath = new URL("./__tests__/valid-cache-file.json", import.meta.url);
  const cacheFile = await CacheFile.load(filepath);
  assert.equal(cacheFile.filepath, filepath);
  const content = await readFile(filepath, "utf8").then((string) => JSON.parse(string));
  assert.equal(CacheFileContent.encode(cacheFile.content), content);
});

test("add", async () => {
  const filepath = new URL("./absent.json", import.meta.url);
  const cacheFile = await CacheFile.load(filepath);
  assert.equal(cacheFile.programs.length, 0);
  // New
  cacheFile.add(FAUX_PROGRAM_CONTENT);
  assert.equal(cacheFile.programs.length, 1);
  // Overwrite
  cacheFile.add(FAUX_PROGRAM_CONTENT);
  assert.equal(cacheFile.programs.length, 1);
  // Dedupe by hash
  cacheFile.add({
    ...FAUX_PROGRAM_CONTENT,
    verificationKey: {
      ...FAUX_PROGRAM_CONTENT.verificationKey,
      hash: Field(2),
    },
  });
  assert.equal(cacheFile.programs.length, 2);
});

test("save: overwrite", async () => {
  const dirHandler = await dir({ unsafeCleanup: true });
  const tmpFolder = new URL(`file://${dirHandler.path}/`);
  const filepath = new URL("./cache-file.json", tmpFolder);

  const cacheFile0 = await CacheFile.load(filepath);
  assert.equal(cacheFile0.programs.length, 0);
  cacheFile0.add(FAUX_PROGRAM_CONTENT);
  await cacheFile0.save();

  const cacheFile1 = await CacheFile.load(filepath);
  assert.equal(cacheFile1.programs.length, 1);

  await dirHandler.cleanup();
});

test("save: create new file and folder", async () => {
  const dirHandler = await dir({ unsafeCleanup: true });
  const tmpFolder = new URL(`file://${dirHandler.path}/foo/blah/bar/`);
  try {
    await stat(tmpFolder);
    assert.unreachable();
  } catch (e: any) {
    // The folder does not exist
    assert.equal(e.code, "ENOENT");
  }
  const filepath = new URL("./cache-file.json", tmpFolder);

  const cacheFile = await CacheFile.load(filepath);
  await cacheFile.save();

  // The folder is created
  assert.ok(await stat(tmpFolder));

  await dirHandler.cleanup();
});

test("table", async () => {
  const filepath = new URL("./__tests__/valid-cache-file.json", import.meta.url);
  const cacheFile = await CacheFile.load(filepath);
  const table = cacheFile.table();
  assert.equal(table.length, 1);
  const first = table[0];
  assert.equal(first.name, "hello-program");
  assert.equal(first.hash, "uJS7R9Qnl78lcuvLU7yVsZaAVYD_otIMyBjj8G2XV42I");
  assert.equal(first.files, 10);
  assert.equal(first.size, 16744375);
});

test.run();
