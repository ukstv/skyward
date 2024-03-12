import type { CompilableProgramLike, CompileOpts } from "./shared/compilable-program-like.js";
import { nearestPackageFolder } from "./local/ancillary/nearest-package-folder.js";
import cacheDir from "cachedir";
import { CacheFile, type ProgramFiles } from "./local/cache-file.js";
import { LocalFileCache } from "./local/local-file-cache.js";
import { stat } from "node:fs/promises";

export async function prepare<TCompilable extends CompilableProgramLike>(
  program: TCompilable,
  opts: Partial<Omit<CompileOpts, "cache">> = {},
): Promise<Awaited<ReturnType<TCompilable["compile"]>>> {
  const packageFolder = await nearestPackageFolder();
  const cacheFolder = new URL(`file://${cacheDir("o1js")}/`);
  const cacheFilepath = CacheFile.filepath(packageFolder);
  const cacheFile = await CacheFile.load(cacheFilepath);
  const localFileCache = await LocalFileCache.make(cacheFolder);
  const compilationResult = await program.compile({ ...opts, cache: localFileCache });
  const files: ProgramFiles = {};
  for (const [filename, dataType] of Object.entries(localFileCache.files)) {
    const filepath = new URL(`./${filename}`, cacheFolder);
    const { size } = await stat(filepath);
    files[filename] = {
      href: filepath,
      size: size,
      dataType: dataType,
    };
  }
  cacheFile.add({
    name: program.name,
    verificationKey: compilationResult.verificationKey,
    files: files,
  });
  await cacheFile.save();
  return compilationResult as any;
}
