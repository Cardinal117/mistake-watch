import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";

const canRenderApplication =
  Boolean(process.env.PLAYWRIGHT_BASE_URL) || existsSync(".env.local");
const applicationTest = canRenderApplication ? test : test.skip;

applicationTest(
  "public application shell renders without a framework error",
  async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Mistake Watch/);
    await expect(
      page.getByRole("link", { name: "Mistake Watch dashboard" }),
    ).toBeVisible();
  },
);

test("liveness remains shallow and dependency readiness is sanitized", async ({
  request,
}) => {
  const healthResponse = await request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  await expect(healthResponse.json()).resolves.toEqual({
    ok: true,
    service: "mistake-watch",
  });

  const readinessResponse = await request.get("/api/ready");
  expect([200, 503]).toContain(readinessResponse.status());
  const readiness = await readinessResponse.json();

  expect(readiness).toMatchObject({
    checks: {
      cloudconvert: { status: expect.any(String) },
      spacetime: { status: expect.any(String) },
      supabase: { status: expect.any(String) },
    },
    ok: expect.any(Boolean),
    service: "mistake-watch",
    status: expect.stringMatching(/^(ready|not_ready)$/),
  });
  expect(JSON.stringify(readiness)).not.toMatch(
    /token|secret|stack|exception|https?:\/\//i,
  );
});
