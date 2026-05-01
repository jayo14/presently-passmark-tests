import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";
import { STUDENT_USER, STUDENT_USER_2 } from "../utils/fixtures";
import { createPresentlyState, installPresentlyBackend } from "../utils/mock-presently";

test.describe("Attendance stress scenarios", () => {
  test("multiple students can mark the same session at the same time without duplicate records", async ({ browser }) => {
    const shared = createPresentlyState({ attendances: [] });
    const baseURL = test.info().project.use.baseURL as string;

    const contextA = await browser.newContext({ baseURL });
    const contextB = await browser.newContext({ baseURL });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const stateA = { ...shared, currentUser: STUDENT_USER };
    const stateB = { ...shared, currentUser: STUDENT_USER_2 };
    await installPresentlyBackend(pageA, stateA);
    await installPresentlyBackend(pageB, stateB);

    await Promise.all([
      pageA.goto("/check-in/ABCD1234"),
      pageB.goto("/check-in/ABCD1234"),
    ]);

    await Promise.all([
      runSteps({
        page: pageA,
        test,
        expect,
        userFlow: "Alice checks in while another student does the same at the same moment",
        steps: [{ description: "Let Alice Student complete the active attendance check-in" }],
        assertions: [{ assertion: "the session should accept Alice's attendance" }],
      }),
      runSteps({
        page: pageB,
        test,
        expect,
        userFlow: "Ben checks in at the same time as Alice",
        steps: [{ description: "Let Ben Student complete the same attendance check-in concurrently" }],
        assertions: [{ assertion: "the session should accept Ben's attendance independently" }],
      }),
    ]);

    await expect(pageA).toHaveURL(/\/dashboard(?:\/|$)/);
    await expect(pageB).toHaveURL(/\/dashboard(?:\/|$)/);
    expect(shared.attendances.filter((record) => record.session === 1)).toHaveLength(2);
    expect(new Set(shared.attendances.filter((record) => record.session === 1).map((record) => record.student)).size).toBe(2);

    await contextA.close();
    await contextB.close();
  });

  test("rapid repeated interactions still collapse into one attendance submission per student", async ({ page }) => {
    const state = createPresentlyState({ attendances: [] });
    state.currentUser = STUDENT_USER;
    state.checkInDelayMs = 400;
    await installPresentlyBackend(page, state);

    await page.goto("/dashboard");

    await runSteps({
      page,
      test,
      expect,
      userFlow: "Student hammers the attendance controls repeatedly",
      steps: [
        { description: "Open the scanner and switch to keyboard entry" },
        { description: "Keep retrying the verification button several times in a row" },
      ],
      assertions: [
        { assertion: "the system should still only write one attendance row" },
        { assertion: "the dashboard should stay responsive after the spammy interaction" },
      ],
    });

    await page.getByPlaceholder("••••••••").fill("ABCD1234");
    const validate = page.getByRole("button", { name: /validate session code/i });
    await validate.evaluate((element) => {
      const button = element as HTMLButtonElement;
      for (let i = 0; i < 5; i += 1) {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
    });

    await page.waitForTimeout(1000);
    expect(state.attendances.filter((record) => record.student === STUDENT_USER.id)).toHaveLength(1);
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
  });
});
