import { CacheFile } from "../../local/cache-file.js";
import Table from "cli-table3";
import { partial } from "filesize";

const humanSize = partial({ standard: "jedec" });

export async function list(packageFolder: URL) {
  const filepath = CacheFile.filepath(packageFolder);
  const cacheFile = await CacheFile.load(filepath);
  const table = new Table({
    head: ["Name", "Hash", "Files", "Size"],
    style: {
      head: ["bold"],
    },
  });
  for (const entry of cacheFile.table()) {
    table.push([entry.name, entry.hash, entry.files, humanSize(entry.size)]);
  }
  console.log(table.toString());
}
