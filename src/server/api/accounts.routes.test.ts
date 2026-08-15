import { describe, expect, it } from "vitest";

import { DELETE as deleteAccountRoute } from "@/app/api/v1/account/route";
import {
  GET as getProfileRoute,
  PATCH as patchProfileRoute,
} from "@/app/api/v1/profile/route";
import {
  GET as listSavedCalculationsRoute,
  POST as createSavedCalculationRoute,
} from "@/app/api/v1/saved-calculations/route";
import {
  DELETE as deleteSavedCalculationRoute,
  GET as getSavedCalculationRoute,
  PATCH as renameSavedCalculationRoute,
} from "@/app/api/v1/saved-calculations/[id]/route";
import { GET as exportSavedCalculationRoute } from "@/app/api/v1/saved-calculations/[id]/export/route";
import { signUp, snapshotFixture } from "@/server/api/test-utils";

describe("account and saves HTTP routes", () => {
  it("exposes profile, saves, export, and account deletion through the HTTP layer", async () => {
    const headers = await signUp();

    const profile = await getProfileRoute(new Request("http://localhost/api/v1/profile", { headers }));
    expect(profile.status).toBe(200);
    expect(await profile.json()).toMatchObject({ locale: "en", timezone: "Asia/Colombo" });

    const update = await patchProfileRoute(new Request("http://localhost/api/v1/profile", {
      method: "PATCH",
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "si" }),
    }));
    expect(update.status).toBe(200);

    const created = await createSavedCalculationRoute(new Request("http://localhost/api/v1/saved-calculations", {
      method: "POST",
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Route smoke",
        calculatorKey: "percentage",
        input: { value: "250" },
        result: snapshotFixture(),
      }),
    }));
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { id: string };
    const savedId = createdBody.id;

    const list = await listSavedCalculationsRoute(new Request("http://localhost/api/v1/saved-calculations", { headers }));
    expect(list.status).toBe(200);
    expect((await list.json()) as Array<{ name: string }>).toHaveLength(1);

    const fetched = await getSavedCalculationRoute(new Request(`http://localhost/api/v1/saved-calculations/${savedId}`, { headers }), {
      params: Promise.resolve({ id: savedId }),
    });
    expect(fetched.status).toBe(200);

    const renamed = await renameSavedCalculationRoute(new Request(`http://localhost/api/v1/saved-calculations/${savedId}`, {
      method: "PATCH",
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed route smoke" }),
    }), { params: Promise.resolve({ id: savedId }) });
    expect(renamed.status).toBe(200);

    const exported = await exportSavedCalculationRoute(new Request(`http://localhost/api/v1/saved-calculations/${savedId}/export`, { headers }), {
      params: Promise.resolve({ id: savedId }),
    });
    expect(exported.status).toBe(200);
    expect(exported.headers.get("Content-Disposition")).toContain("renamed-route-smoke.json");

    const deleted = await deleteSavedCalculationRoute(new Request(`http://localhost/api/v1/saved-calculations/${savedId}`, {
      method: "DELETE",
      headers,
    }), { params: Promise.resolve({ id: savedId }) });
    expect(deleted.status).toBe(204);
    expect(deleted.body).toBeNull();

    const removedAccount = await deleteAccountRoute(new Request("http://localhost/api/v1/account", {
      method: "DELETE",
      headers,
    }));
    expect(removedAccount.status).toBe(204);
    expect(removedAccount.body).toBeNull();

    const afterDelete = await getProfileRoute(new Request("http://localhost/api/v1/profile", { headers }));
    expect(afterDelete.status).toBe(401);
  });

  it("requires sign-in for every route without a session", async () => {
    const anonymous = new Request("http://localhost/api/v1/profile");
    expect((await getProfileRoute(anonymous)).status).toBe(401);
    expect((await listSavedCalculationsRoute(anonymous)).status).toBe(401);
    expect((await createSavedCalculationRoute(new Request("http://localhost/api/v1/saved-calculations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x", calculatorKey: "percentage", input: {}, result: snapshotFixture() }),
    }))).status).toBe(401);
  });
});
