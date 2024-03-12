import { CacheFile } from "../../local/cache-file.js";
import { ManifestFactory } from "../../local/manifest-factory.js";

type ExtractParams = {
  cacheFolder: URL;
  packageFolder: URL;
  outFolder: URL;
  program: Array<string> | undefined;
};

export async function extract(params: ExtractParams) {
  const filepath = CacheFile.filepath(params.packageFolder);
  const cacheFile = await CacheFile.load(filepath);
  const filter = params.program;
  const programs = cacheFile.programs.filter(filter);

  if (programs.length === 0) {
    if (filter && filter.length > 0) {
      console.log(`No artifacts to extract for programs: ${filter.join(", ")}`);
    } else {
      console.log("No artifacts to extract");
    }
    return;
  }

  const manifest = await ManifestFactory.fromCacheFile(params.outFolder, cacheFile);
  await ManifestFactory.save(manifest, ManifestFactory.filepath(params.outFolder));
}
