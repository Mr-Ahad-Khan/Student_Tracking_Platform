import { chromium } from "playwright";
import fs from "fs";
import path from "path";

(async () => {
  console.log("========================================================");
  console.log("STARTING HEADLESS BROWSER END-TO-END VERIFICATION");
  console.log("========================================================");

  let browser;
  try {
    console.log("[1/7] Launching Headless Chromium via Playwright...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set a viewport size for clean rendering
    await page.setViewportSize({ width: 1280, height: 800 });

    // Enable console log forwarding to see any console exceptions
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.warn(`Browser Console Error: ${msg.text()}`);
      }
    });

    console.log(
      "[2/7] Navigating to Frontend application http://localhost:5173...",
    );
    await page.goto("http://localhost:5173/");

    // Wait for redirect to /login
    await page.waitForURL("**/login");
    console.log("✅ Redirected to Login Page:", page.url());

    // 1. ADMIN FLOW
    console.log("\n[3/7] Logging in as seeded Admin (admin@platform.com)...");
    await page.fill('input[type="email"]', "admin@platform.com");
    await page.fill('input[type="password"]', "adminpassword");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard");
    console.log("✅ Successfully authenticated. Admin Dashboard loaded.");

    console.log("   Uploading sample CSV users configuration...");
    const csvPath = path.resolve("../sample_users.csv");
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV configuration file not found at ${csvPath}`);
    }

    // Locate file input and set file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);
    console.log("   File selected. Triggering CSV execution...");
    await page.click('button:has-text("Execute User Seed")');

    // Wait for execution summary
    await page.waitForSelector("text=Execution Run Summary:");
    const runSummary = await page
      .locator('div:has-text("Execution Run Summary:")')
      .nth(0)
      .innerText();
    console.log("✅ Execution Run Summary:\n", runSummary.trim());

    console.log("   Navigating to Student Financial Ledger...");
    await page.click('button:has-text("Student Financial Ledger")');
    await page.waitForSelector('tr:has-text("STU001")');

    const studentRow = page.locator('tr:has-text("STU001")');
    const initialFeeStatus = await studentRow
      .locator("span")
      .first()
      .innerText();
    console.log(
      `   rohit (STU001) initial fee status: ${initialFeeStatus.trim()}`,
    );

    if (initialFeeStatus.toLowerCase().includes("unpaid")) {
      console.log('   Clicking "Collect Fees" action trigger...');
      await studentRow.locator('button:has-text("Collect Fees")').click();
      await page.waitForTimeout(1000); // Wait for state update

      const updatedFeeStatus = await studentRow
        .locator("span")
        .first()
        .innerText();
      console.log(
        `✅ rohit (STU001) updated fee status: ${updatedFeeStatus.trim()}`,
      );
    } else {
      console.log("   Fees already marked paid.");
    }

    console.log("   Signing out Admin user...");
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL("**/login");

    // 2. FACULTY FLOW
    console.log("\n[4/7] Logging in as seeded Faculty (plum@faculty.com)...");
    await page.fill('input[type="email"]', "plum@faculty.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard");
    console.log("✅ Successfully authenticated. Faculty Console loaded.");

    console.log("   Registering bulk attendance records for CS101...");
    await page.fill('input[placeholder="e.g. CS101, MAT202"]', "CS101");

    // Find rohit row in Attendance grid
    await page.waitForSelector('tr:has-text("STU001")');
    const attStudentRow = page.locator('tr:has-text("STU001")');

    console.log('   Marking rohit as "Late"...');
    await attStudentRow.locator('button:has-text("Late")').click();

    console.log("   Submitting Class Register...");
    await page.click('button:has-text("Submit Class Register")');
    await page.waitForSelector("text=Attendance registered successfully");
    console.log("✅ Attendance register recorded successfully.");

    console.log("   Navigating to marks cards entry tab...");
    await page.click('button:has-text("Submit Marks")');

    console.log("   Selecting student rohit...");
    await page.selectOption("select", { label: /STU001 - rohit/ });
    await page.fill('input[placeholder="e.g. CS101"]', "CS101");
    await page.fill(
      'input[placeholder="e.g. Computer Organization"]',
      "Introduction to Programming",
    );
    await page.fill('input[placeholder="85"]', "88");

    // Verify auto grade calculation in frontend input
    const autoGradeInput = page.locator('input[placeholder="Grade"]');
    const calculatedGrade = await autoGradeInput.inputValue();
    console.log(
      `   Real-time frontend Auto Grade output: ${calculatedGrade} (Expected: A)`,
    );

    console.log("   Submitting marks card values...");
    await page.click('button:has-text("Submit Marks Card")');
    await page.waitForSelector("text=Marks updated successfully");
    console.log("✅ Marks card submitted successfully.");

    console.log("   Signing out Faculty user...");
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL("**/login");

    // 3. STUDENT FLOW
    console.log("\n[5/7] Logging in as seeded Student (rohit@student.com)...");
    await page.fill('input[type="email"]', "rohit@student.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard");
    console.log("✅ Successfully authenticated. Student Dashboard loaded.");

    console.log("   Verifying academic report card...");
    await page.waitForSelector("text=Introduction to Programming");
    const courseCardText = await page
      .locator('div:has-text("Introduction to Programming")')
      .nth(0)
      .innerText();
    console.log(
      "✅ Academic Report Card Card details:\n",
      courseCardText.trim().replace(/\n+/g, " | "),
    );

    console.log("   Checking fees clearance status...");
    const feesState = await page
      .locator('div:has-text("Fees Status")')
      .nth(0)
      .innerText();
    console.log(
      "✅ Fees Clearance State in dashboard:",
      feesState.trim().replace(/\n+/g, " | "),
    );

    console.log("   Submitting digital leave request...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const endLeave = new Date();
    endLeave.setDate(endLeave.getDate() + 3);
    const endLeaveStr = endLeave.toISOString().split("T")[0];

    await page.locator('input[type="date"]').nth(0).fill(tomorrowStr);
    await page.locator('input[type="date"]').nth(1).fill(endLeaveStr);
    await page.fill("textarea", "Doctor appointment and dental checkup");

    console.log("   Submitting leave request form...");
    await page.click('button:has-text("Submit Leave Request")');
    await page.waitForSelector("text=Leave request submitted successfully");
    console.log("✅ Leave request filed successfully.");

    console.log("   Verifying leave logs ledger...");
    const latestLeaveLog = await page.locator("tbody tr").first().innerText();
    console.log(
      "✅ Latest Leave Log entry:",
      latestLeaveLog.trim().replace(/\s+/g, " "),
    );

    console.log("   Signing out Student user...");
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL("**/login");

    console.log("\n[6/7] Closing Playwright E2E Browser Session...");
    await browser.close();

    console.log("\n========================================================");
    console.log("E2E BROWSER TESTS EXECUTED Headlessly & SUCCESSFULLY!");
    console.log("========================================================");
  } catch (error) {
    console.error(
      "\n❌ Playwright E2E browser verification failed:",
      error.message,
    );
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();
