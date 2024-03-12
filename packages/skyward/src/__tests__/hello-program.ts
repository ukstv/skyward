import { Bool, Field, ZkProgram } from "o1js";

export const HelloProgram = ZkProgram({
  name: "hello-program",
  publicInput: Field,
  publicOutput: Bool,
  methods: {
    addition: {
      privateInputs: [Field, Field],
      method(sum, a, b) {
        return a.add(b).equals(sum);
      },
    },
  },
});
