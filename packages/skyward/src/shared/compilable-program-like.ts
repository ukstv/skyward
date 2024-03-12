import type { Cache, Field } from "o1js";

export type VerificationKey = {
  data: string;
  hash: Field;
};

export type CompileOpts = {
  cache: Cache;
  forceRecompile: boolean;
};

export type CompilableProgramLike = {
  name: string;
  compile(options?: Partial<CompileOpts>): Promise<{ verificationKey: VerificationKey }>;
};
