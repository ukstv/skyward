import { CacheFile } from "./cache-file.js";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { ProgramManifest, ManifestContent } from "../shared/manifest-content.js";
import { integritySHA384 } from "./ancillary/integrity.js";
import { fieldAsBase64url } from "../shared/codecs.js";
import { CLIENT } from "./client.js";
import type { ConfigFileContent } from "./config-file.js";

async function uploadFn(
  userId: string,
  token: string,
  bytes: Uint8Array,
  localFilename: URL,
  remoteFilename: string,
): Promise<URL> {
  const r = await CLIENT.users.buckets.upload({
    params: {
      id: userId,
    },
    body: {
      filename: remoteFilename,
    },
    headers: {
      authorization: token,
    },
  });
  if (r.status !== 200) {
    throw new Error(`Unsuccessful upload initiation attempt`);
  }
  const policy = r.body.policy;
  const uploadUrl = policy.url;
  const fields = policy.fields;

  const formData = new FormData();
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    formData.append(fieldName, fieldValue);
  }

  const file = new File([bytes], remoteFilename);
  formData.append("file", file);
  const upload = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });
  if (upload.status !== 204) {
    throw new Error(`Not uploaded: ${localFilename.href}`);
  }
  return new URL(`https://d.skyward.run/${userId}/${remoteFilename}`);
}

export class ManifestFactory {
  static filepath(outFolder: URL) {
    return new URL(`./skyward.json`, outFolder);
  }

  static async fromCacheFile(outFolder: URL, cacheFile: CacheFile, doCopy: boolean = true) {
    await mkdir(outFolder, { recursive: true });
    const programs: ManifestContent["programs"] = {};
    const copyP = new Array<Promise<void>>();
    for (const p of cacheFile.programs) {
      const programHash = fieldAsBase64url.encode(p.verificationKey.hash);
      const outFiles: ProgramManifest["files"] = {};

      for (const [filename, fileProps] of Object.entries(p.files)) {
        const sourceFilepath = fileProps.href;

        const destinationFilepath = new URL(`./${filename}`, outFolder);
        const bytes = await readFile(sourceFilepath);
        const integrity = integritySHA384(bytes);

        if (doCopy) {
          copyP.push(copyFile(sourceFilepath, destinationFilepath));
        }
        const href = destinationFilepath.href.replace(outFolder.href, "./");

        outFiles[filename] = {
          dataType: fileProps.dataType,
          href: href,
          integrity: integrity,
        };
      }
      programs[fieldAsBase64url.encode(p.verificationKey.hash)] = {
        name: p.name,
        verificationKey: p.verificationKey,
        files: outFiles,
      };
    }
    await Promise.all(copyP);
    const content: ManifestContent = {
      version: "1",
      programs: programs,
    };
    return content;
  }

  static async fromCacheFileUpload(config: ConfigFileContent, outFolder: URL, cacheFile: CacheFile) {
    await mkdir(outFolder, { recursive: true });
    const programs: ManifestContent["programs"] = {};
    const copyP = new Array<Promise<void>>();
    for (const p of cacheFile.programs) {
      const programHash = fieldAsBase64url.encode(p.verificationKey.hash);
      const outFiles: ProgramManifest["files"] = {};

      for (const [filename, fileProps] of Object.entries(p.files)) {
        const sourceFilepath = fileProps.href;

        const remoteFilename = `${programHash}/${filename}`;
        const bytes = await readFile(sourceFilepath);
        const integrity = integritySHA384(bytes);

        const href = await uploadFn(config.id, config.token, bytes, sourceFilepath, remoteFilename);

        outFiles[filename] = {
          dataType: fileProps.dataType,
          href: href.href,
          integrity: integrity,
        };
      }
      programs[fieldAsBase64url.encode(p.verificationKey.hash)] = {
        name: p.name,
        verificationKey: p.verificationKey,
        files: outFiles,
      };
    }
    await Promise.all(copyP);
    const content: ManifestContent = {
      version: "1",
      programs: programs,
    };
    return content;
  }

  static async save(content: ManifestContent, filepath: URL) {
    const asJSON = ManifestContent.encode(content);
    const asString = JSON.stringify(asJSON);
    await writeFile(filepath, asString, "utf8");
  }
}
