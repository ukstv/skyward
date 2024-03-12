import { type, literal, record, string, type TypeOf } from "codeco";
import { dataTypeCodec, verificationKeyCodec } from "./codecs.js";

const FileManifest = type({
  dataType: dataTypeCodec,
  href: string,
  integrity: string,
});
export type FileManifest = TypeOf<typeof FileManifest>;

const ProgramManifest = type({
  name: string,
  verificationKey: verificationKeyCodec,
  files: record(string, FileManifest),
});
export type ProgramManifest = TypeOf<typeof ProgramManifest>;

export const ManifestContent = type({
  version: literal("1"),
  programs: record(string, ProgramManifest),
});
export type ManifestContent = TypeOf<typeof ManifestContent>;
