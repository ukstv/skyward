import * as http from "node:http";
import { rm } from "node:fs/promises";
import handler from "serve-handler";
import { CacheFile } from "../../local/cache-file.js";
import { ManifestFactory } from "../../local/manifest-factory.js";

function asFolder(url: URL) {
  return url.href.replace("file://", "");
}

export async function serve(port: number, packageFolder: URL, cacheFolder: URL) {
  const filepath = CacheFile.filepath(packageFolder);
  const cacheFile = await CacheFile.load(filepath);
  const manifest = await ManifestFactory.fromCacheFile(cacheFolder, cacheFile, false);
  const manifestFilepath = ManifestFactory.filepath(cacheFolder);
  await ManifestFactory.save(manifest, manifestFilepath);

  const config = {
    public: asFolder(cacheFolder),
    headers: [
      {
        source: "*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ],
  };
  const server = http.createServer((req, res) => {
    res.once("close", () => {
      console.log(req.method, req.url);
    });
    return handler(req, res, config);
  });
  server.listen(port, () => {
    console.log(`Serving ZK artifacts on http://localhost:${port}/`);
  });
  await new Promise<void>((resolve) => {
    server.on("close", async () => {
      await rm(manifestFilepath);
      resolve();
    });
  });
}
