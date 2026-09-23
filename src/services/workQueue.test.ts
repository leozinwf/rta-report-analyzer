import { describe, expect, it } from "vitest";
import { makeClassified } from "../fixtures/sampleExecutions";
import { analyzeReport } from "./analysis";
import { buildWorkQueue } from "./workQueue";

describe("work queue", () => {
  it("flags a robot with 100% instability and no success as needing a card", () => {
    const executions = Array.from({ length: 4 }, (_, index) => makeClassified({
      id: `A-${index + 1}`,
      robot: "Certidão X",
      status: "Site Instável",
      canonicalStatus: "instability",
      eventType: "instability",
      category: "infrastructure",
      message: "O site não está disponível",
    }));

    const queue = buildWorkQueue(analyzeReport(executions), executions, []);

    expect(queue[0]?.decision).toBe("open");
    expect(queue[0]?.robotInstabilities).toBe(4);
  });

  it("keeps Site Error separate from Site Instável in the evidence", () => {
    const executions = [
      makeClassified({ id: "A-1", robot: "Certidão X", status: "Site Error", canonicalStatus: "error" }),
      makeClassified({ id: "A-2", robot: "Certidão X", status: "Site Instável", canonicalStatus: "instability", eventType: "instability" }),
      makeClassified({ id: "A-3", robot: "Certidão X", status: "Site Error", canonicalStatus: "error" }),
    ];

    const queue = buildWorkQueue(analyzeReport(executions), executions, []);

    expect(queue.some((item) => item.robotSiteErrors === 2)).toBe(true);
    expect(queue.some((item) => item.robotInstabilities === 1)).toBe(true);
  });
});
