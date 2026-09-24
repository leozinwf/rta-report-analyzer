import { describe, expect, it, vi } from "vitest";
import { jiraJson, retryAfterMilliseconds } from "../../../api/jira.js";

describe("Jira API resilience", () => {
  it("understands Retry-After in seconds and HTTP date formats", () => {
    expect(retryAfterMilliseconds("2", 0, 0)).toBe(2_000);
    expect(retryAfterMilliseconds("Thu, 01 Jan 1970 00:00:03 GMT", 0, 1_000)).toBe(2_000);
    expect(retryAfterMilliseconds(null, 2, 0)).toBe(2_000);
  });

  it("waits and retries a short Jira rate limit response", async () => {
    const responses = [
      new Response(JSON.stringify({ message: "rate limited" }), { status: 429, headers: { "Retry-After": "1" } }),
      new Response(JSON.stringify({ issues: [{ key: "DM-1" }] }), { status: 200 }),
    ];
    const fetcher = vi.fn(async () => responses.shift() as Response) as unknown as typeof fetch;
    const sleeps: number[] = [];

    const result = await jiraJson<{ issues: Array<{ key: string }> }>("https://example.atlassian.net", {}, {
      fetcher,
      sleep: async (milliseconds) => { sleeps.push(milliseconds); },
    });

    expect(result.issues[0]?.key).toBe("DM-1");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([1_000]);
  });

  it("does not hold a serverless function open for a long Retry-After", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ message: "slow down" }), {
      status: 429,
      headers: { "Retry-After": "30" },
    })) as unknown as typeof fetch;

    await expect(jiraJson("https://example.atlassian.net", {}, { fetcher }))
      .rejects.toMatchObject({ status: 429, retryAfterSeconds: 30 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
