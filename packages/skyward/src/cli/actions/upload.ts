import { CacheFile } from "../../local/cache-file.js";
import { ManifestFactory } from "../../local/manifest-factory.js";
import { ConfigFile } from "../../local/config-file.js";

type UploadParams = {
  cacheFolder: URL;
  cwd: URL;
  packageFolder: URL;
  outFolder: URL;
  program: Array<string> | undefined;
};

export async function upload(params: UploadParams) {
  const filepath = CacheFile.filepath(params.packageFolder);
  const cacheFile = await CacheFile.load(filepath);
  const filter = params.program;
  const programs = cacheFile.programs.filter(filter);

  if (programs.length === 0) {
    if (filter && filter.length > 0) {
      console.log(`No artifacts to upload for programs: ${filter.join(", ")}`);
    } else {
      console.log("No artifacts to upload");
    }
    return;
  }

  const config = await ConfigFile.load(params.cwd);
  const configContent = config.content
  if (!configContent) {
    throw new Error(`Can upload after logged in`)
  }
  const manifest = await ManifestFactory.fromCacheFileUpload(configContent, params.outFolder, cacheFile);
  await ManifestFactory.save(manifest, ManifestFactory.filepath(params.outFolder));
}
