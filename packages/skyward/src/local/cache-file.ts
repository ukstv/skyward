import { type, literal, string, record, number, decode, type TypeOf } from "codeco";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dataTypeCodec, fieldAsBase64url, urlAsString, verificationKeyCodec } from "../shared/codecs.js";
import type { Field } from "o1js";

const FileContent = type({
  href: urlAsString,
  dataType: dataTypeCodec,
  size: number,
});

const ProgramFiles = record(string, FileContent);
export type ProgramFiles = TypeOf<typeof ProgramFiles>;

const ProgramContent = type({
  name: string,
  verificationKey: verificationKeyCodec,
  files: ProgramFiles,
});
export type ProgramContent = TypeOf<typeof ProgramContent>;

export const CacheFileContent = type({
  version: literal("1"),
  programs: record(string, ProgramContent),
});
type CacheFileContent = TypeOf<typeof CacheFileContent>;

export class InvalidCacheFileError extends Error {
  constructor(filepath: URL, opts?: ErrorOptions) {
    super(`Invalid cache file at ${filepath.href}`, opts);
  }
}

type TableEntry = {
  name: string;
  hash: string;
  files: number;
  size: number;
};

function emptyContent(): CacheFileContent {
  return {
    version: "1",
    programs: {},
  };
}

export class Programs implements Iterable<ProgramContent> {
  readonly reduce: Array<ProgramContent>["reduce"];
  readonly length: number;

  constructor(private readonly programs: Array<ProgramContent>) {
    this.reduce = this.programs.reduce.bind(this.programs);
    this.length = this.programs.length;
  }

  [Symbol.iterator](): Iterator<ProgramContent> {
    return this.entries();
  }

  private *entries(): Generator<ProgramContent> {
    for (const a of this.programs) {
      yield a;
    }
  }

  filter(nameOrHash: Array<string | Field> | undefined): Programs {
    if (!nameOrHash) return new Programs(this.programs);

    const filters = nameOrHash.map((n) => {
      return typeof n === "string" ? n : fieldAsBase64url.encode(n);
    });
    const next = this.programs.filter((program) => {
      return filters.includes(program.name) || filters.includes(fieldAsBase64url.encode(program.verificationKey.hash));
    });
    return new Programs(next);
  }
}

export class CacheFile {
  readonly #filepath: URL;
  readonly #content: CacheFileContent;

  constructor(filepath: URL, content: CacheFileContent = emptyContent()) {
    this.#filepath = filepath;
    this.#content = content;
  }

  get filepath(): URL {
    return this.#filepath;
  }

  get content(): CacheFileContent {
    return this.#content as any;
  }

  static filepath(folder: URL): URL {
    return new URL(`./node_modules/.skyward/cache-file.json`, folder);
  }

  static async load(filepath: URL) {
    const string = await readFile(filepath, "utf8").catch(() => undefined);
    if (string) {
      try {
        const content = decode(CacheFileContent, JSON.parse(string));
        return new CacheFile(filepath, content);
      } catch (e) {
        throw new InvalidCacheFileError(filepath, { cause: e });
      }
    } else {
      return new CacheFile(filepath);
    }
  }

  get programs(): Programs {
    return new Programs(Object.values(this.#content.programs));
  }

  add(program: ProgramContent): void {
    const hash = fieldAsBase64url.encode(program.verificationKey.hash);
    this.#content.programs[hash] = program;
  }

  async save() {
    const parentFolder = new URL("./", this.filepath);
    await mkdir(parentFolder, { recursive: true });
    const asJSON = CacheFileContent.encode(this.#content);
    const asString = JSON.stringify(asJSON, null, 2);
    await writeFile(this.filepath, asString, "utf8");
  }

  table(): Array<TableEntry> {
    return this.programs.reduce((acc, program) => {
      const hash = fieldAsBase64url.encode(program.verificationKey.hash);
      let totalSize: number = 0;
      for (const fileName in program.files) {
        const file = program.files[fileName];
        if (file) {
          totalSize += file.size;
        }
      }
      return acc.concat({
        name: program.name,
        hash: hash,
        files: Object.keys(program.files).length,
        size: totalSize,
      });
    }, new Array<TableEntry>());
  }
}
