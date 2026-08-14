import { describe, expect, it } from "vitest";

import { createPostgresUrl } from "@/server/env";

describe("createPostgresUrl", () => {
  it("escapes credentials that contain URI delimiters", () => {
    expect(createPostgresUrl({
      host: "db",
      port: "5432",
      database: "lanka calc",
      user: "user/name",
      password: "p@ss/#word",
    })).toBe("postgresql://user%2Fname:p%40ss%2F%23word@db:5432/lanka%20calc");
  });
});
