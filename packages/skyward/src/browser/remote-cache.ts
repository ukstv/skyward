import type { Cache, CacheHeader } from "o1js";
import { decode } from "codeco";
import { FileManifest, ManifestContent } from "../shared/manifest-content.js";
import { UnreachableCaseError } from "../shared/unreachable-case-error.js";

const TEXT_ENCODER = new TextEncoder();
const DEFAULT_URL = new URL("http://localhost:4040/skyward.json");

class ManifestSource {
  readonly manifestURL: URL | undefined;
  private manifest: ManifestContent | undefined;
  private readonly fetchFn: typeof fetch;

  static fromURL(manifestURL: URL | undefined): ManifestSource {
    return new ManifestSource(manifestURL, undefined);
  }

  static fromManifest(content: ManifestContent): ManifestSource {
    return new ManifestSource(undefined, content);
  }

  constructor(
    manifestURL: URL | undefined,
    manifest: ManifestContent | undefined,
    fetchFn: typeof fetch = fetch.bind(globalThis),
  ) {
    this.manifestURL = manifestURL;
    this.manifest = manifest;
    this.fetchFn = fetchFn;
  }

  load(fileManifest: FileManifest): Promise<Response> {
    const url = this.manifestURL ? new URL(fileManifest.href, this.manifestURL) : new URL(fileManifest.href);
    return this.fetchFn(url, {
      integrity: fileManifest.integrity,
    });
  }

  async content(): Promise<ManifestContent> {
    if (this.manifest) return this.manifest;
    if (!this.manifestURL) {
      throw new Error(`Manifest URL must be present`);
    }
    const manifestJSON = await this.fetchFn(this.manifestURL).then((r) => r.json());
    this.manifest = decode(ManifestContent, manifestJSON);
    return this.manifest;
  }
}

export class RemoteCache implements Cache {
  readonly source: ManifestSource;

  readonly canWrite = false;
  readonly debug: boolean;

  private readonly bytes = new Map<string, Uint8Array>();
  private readonly strings = new Map<string, string>();

  static fromManifestURL(url: URL | string = DEFAULT_URL, debug?: boolean): RemoteCache {
    const source = ManifestSource.fromURL(new URL(url));
    return new RemoteCache(source, debug);
  }

  static fromManifest(content: ManifestContent, debug?: boolean): RemoteCache {
    const source = ManifestSource.fromManifest(content);
    return new RemoteCache(source, debug);
  }

  constructor(source: ManifestSource, debug?: boolean) {
    this.source = source;
    this.debug = Boolean(debug);
  }

  async populate(nameOrHash?: string) {
    const manifest = await this.source.content();
    const downloadP: Array<Promise<void>> = [];
    for (const [programHash, program] of Object.entries(manifest.programs)) {
      if (nameOrHash) {
        if (!(program.name === nameOrHash || programHash === nameOrHash)) {
          continue;
        }
      }

      for (const [filename, fileManifest] of Object.entries(program.files)) {
        const dataType = fileManifest.dataType;
        switch (dataType) {
          case "string": {
            const promise = this.source.load(fileManifest).then(async (response) => {
              const text = await response.text();
              this.strings.set(filename, text);
            });
            downloadP.push(promise);
            break;
          }
          case "bytes": {
            const promise = this.source.load(fileManifest).then(async (response) => {
              const blob = await response.blob();
              const buffer = await blob.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              this.bytes.set(filename, bytes);
            });
            downloadP.push(promise);
            break;
          }
          default:
            throw new UnreachableCaseError(dataType);
        }
      }
    }
    await Promise.all(downloadP);
  }

  read(header: CacheHeader): Uint8Array | undefined {
    const { persistentId, uniqueId } = header;
    const currentId = this.strings.get(`${persistentId}.header`);
    if (currentId !== uniqueId) return undefined;

    const dataType = header.dataType;
    switch (dataType) {
      case "string": {
        const string = this.strings.get(persistentId);
        return TEXT_ENCODER.encode(string);
      }
      case "bytes": {
        return this.bytes.get(persistentId);
      }
      default:
        throw new UnreachableCaseError(dataType);
    }
  }

  write(_header: CacheHeader, _value: Uint8Array): void {
    throw new Error("Method not available: RemoteCache::write");
  }
}
