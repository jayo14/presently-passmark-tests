import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";
import { LECTURER_USER } from "../utils/fixtures";
import { createPresentlyState, installPresentlyBackend } from "../utils/mock-presently";

test.describe("Lecturer reporting flow", () => {
  test("a lecturer can review attendance records for a session", async ({ page }) => {
    const state = createPresentlyState();
    state.currentUser = LECTURER_USER;
    await installPresentlyBackend(page, state);

    await page.goto("/dashboard/reports?courseId=1&sessionId=1");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Lecturer reviews the live attendance report for CS301",
      steps: [
        { description: "Open the attendance report for course CS301" },
        { description: "Switch into the session view for the active lecture" },
        { description: "Inspect the attendance table for enrolled students" },
      ],
      assertions: [
        { assertion: "the report should list Alice Student and her matric number" },
        { assertion: "the session table should show a present attendance record" },
      ],
    });

    await expect(page.getByText("Alice Student")).toBeVisible();
    await expect(page.getByText("MAT/2021/001")).toBeVisible();
    await expect(page.getByText("PRESENT")).toBeVisible();
  });

  test("a lecturer can export the session report without losing the current view", async ({ page }) => {
    const state = createPresentlyState();
    state.currentUser = LECTURER_USER;
    await installPresentlyBackend(page, state);

    await page.goto("/dashboard/reports?courseId=1&sessionId=1");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Lecturer exports the current session attendance report",
      steps: [
        { description: "Open the export menu on the attendance report" },
        { description: "Choose the server CSV export option" },
      ],
      assertions: [
        { assertion: "the report should stay visible after exporting" },
        { assertion: "the export action should hit the server export endpoint once" },
      ],
    });

    await page.getByRole("button", { name: /export/i }).click();
    await page.getByRole("button", { name: /csv \(server\)/i }).click();
    await expect(page.getByText("Attendance Reports")).toBeVisible();
    expect(state.counters.exports).toBeGreaterThanOrEqual(1);
  });
});
