import { describe, expect, it } from "vitest";
import path from "node:path";
import { assertPathInsideRoot } from "@/server/safe-path";

describe("assertPathInsideRoot", () => {
  const root = path.join("/tmp", "dammaturu-root");

  it("allows paths under root", () => {
    const ok = assertPathInsideRoot(
      path.join(root, "content", "file.docx"),
      root,
    );
    expect(ok).toBe(path.resolve(root, "content", "file.docx"));
  });

  it("rejects path traversal", () => {
    expect(() =>
      assertPathInsideRoot(path.join(root, "..", "etc", "passwd"), root),
    ).toThrow(/Neplatná cesta/);
  });
});
