import type { Cache, CacheHeader } from "o1js";
import { readFileSync, writeFileSync } from "node:fs";
import { UnreachableCaseError } from "../shared/unreachable-case-error.js";
import { mkdir } from "node:fs/promises";

const TEXT_ENCODER = new TextEncoder();

export type FileType = CacheHeader["dataType"];
export type FilesTouched = Record<string, FileType>;

export class LocalFileCache implements Cache {
  readonly debug: boolean;
  readonly canWrite: boolean = true;

  readonly directory: URL;
  readonly files: FilesTouched;

  constructor(cacheDirectory: URL, debug?: boolean) {
    this.directory = cacheDirectory;
    this.debug = Boolean(debug);
    this.files = {};
  }

  static async make(cacheDirectory: URL, debug?: boolean): Promise<LocalFileCache> {
    await mkdir(cacheDirectory, { recursive: true });
    return new LocalFileCache(cacheDirectory, debug);
  }

  read(header: CacheHeader): Uint8Array | undefined {
    const { persistentId, uniqueId, dataType } = header;
    const headerName = `${persistentId}.header`;

    const currentId = this._read(headerName, "string");
    if (currentId !== uniqueId) return undefined;

    switch (dataType) {
      case "string": {
        const string = this._read(persistentId, dataType);
        return TEXT_ENCODER.encode(string);
      }
      case "bytes": {
        const bytes = this._read(persistentId, dataType);
        return new Uint8Array(bytes.buffer);
      }
      default:
        throw new UnreachableCaseError(dataType);
    }
  }

  write(header: CacheHeader, value: Uint8Array): void {
    const { persistentId, uniqueId, dataType } = header;
    this._write(`${persistentId}.header`, uniqueId, "string");
    this._write(persistentId, value, dataType);
  }

  private _read(name: string, dataType: "string"): string;
  private _read(name: string, dataType: "bytes"): Uint8Array;
  private _read(name: string, dataType: CacheHeader["dataType"]): string | Uint8Array {
    this.files[name] = dataType;
    const filepath = this._filepath(name);
    switch (dataType) {
      case "bytes":
        return readFileSync(filepath);
      case "string":
        return readFileSync(filepath, "utf8");
      default:
        throw new UnreachableCaseError(dataType);
    }
  }

  private _write(name: string, data: Uint8Array | string, dataType: CacheHeader["dataType"]): void {
    this.files[name] = dataType;
    const filePath = this._filepath(name);
    switch (dataType) {
      case "string": {
        writeFileSync(filePath, data, "utf8");
        break;
      }
      case "bytes": {
        writeFileSync(filePath, data);
        break;
      }
      default:
        throw new UnreachableCaseError(dataType);
    }
  }

  private _filepath(name: string) {
    return new URL(`./${name}`, this.directory);
  }
}
