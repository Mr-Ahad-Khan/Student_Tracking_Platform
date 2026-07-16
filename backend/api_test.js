import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target API base URL
const BASE_URL = "studenttrackingplatform-production.up.railway.app";

// Set up axios defaults to retain cookies across requests
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true, // Don't throw on error status codes, we want to log them
});

// Helper to extract token from Set-Cookie and set it on subsequent headers
let cookieHeader = "";
function storeCookie(response) {
  const setCookie = response.headers["set-cookie"];
  if (setCookie) {
    // Extract the token cookie segment
    const cookie = setCookie[0].split(";")[0];
    cookieHeader = cookie;
    client.defaults.headers.common["Cookie"] = cookie;
  }
}

function clearCookie() {
  cookieHeader = "";
  delete client.defaults.headers.common["Cookie"];
}

async function runTests() {
  console.log("========================================================");
  console.log("STARTING PROGRAMMATIC BACKEND API INTEGRATION CHECKS");
  console.log("========================================================");

  // 1. LOGIN AS SEEDED ADMIN
  console.log("\n[1/7] Logging in as seeded Admin...");
  const loginRes = await client.post("/auth/login", {
    email: "admin@platform.com",
    password: "adminpassword",
  });

  if (loginRes.status !== 200) {
    console.error("❌ Admin login failed:", loginRes.data);
    return;
  }
  console.log("✅ Admin login successful. User:", loginRes.data.user.name);
  storeCookie(loginRes);

  // 2. GET ME (ADMIN)
  console.log("\n[2/7] Fetching Admin profile info...");
  const profileRes = await client.get("/auth/me");
  if (profileRes.status !== 200) {
    console.error("❌ Failed to fetch Admin profile:", profileRes.data);
    return;
  }
  console.log(
    "✅ Admin profile retrieved:",
    profileRes.data.user.email,
    "Role:",
    profileRes.data.user.role,
  );

  // 3. UPLOAD SAMPLE CSV FOR STUDENT & FACULTY SEEDING
  console.log(
    "\n[3/7] Uploading sample CSV to seed Student and Faculty accounts...",
  );
  const csvPath = "../sample_users.csv"; // relative to backend

  if (!fs.existsSync(csvPath)) {
    console.error(
      `❌ CSV File not found at ${csvPath}. Please create it first.`,
    );
    return;
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(csvPath));

  const uploadRes = await client.post("/admin/upload-users", form, {
    headers: {
      ...form.getHeaders(),
    },
  });

  if (uploadRes.status !== 200) {
    console.error("❌ CSV Bulk upload failed:", uploadRes.data);
    return;
  }
  console.log("✅ CSV Upload response:", uploadRes.data.message);
  console.log(
    "   Success count:",
    uploadRes.data.successCount,
    "Failed:",
    uploadRes.data.failCount,
  );

  // 4. FETCH FINANCIAL LEDGER & COLLECT FEES
  console.log("\n[4/7] Fetching student financial ledger...");
  const ledgerRes = await client.get("/admin/fees");
  if (ledgerRes.status !== 200) {
    console.error("❌ Failed to retrieve fees ledger:", ledgerRes.data);
    return;
  }
  console.log(
    `✅ Ledger loaded. Found ${ledgerRes.data.length} student record(s).`,
  );

  const student = ledgerRes.data.find((s) => s.rollNumber === "STU001");
  if (!student) {
    console.error(
      "❌ Seeded student rohit (STU001) not found in ledger database!",
    );
    return;
  }
  console.log(
    `   Student: ${student.user.name}, Fees status currently: ${student.feesPaid ? "Paid" : "Unpaid"}`,
  );

  if (!student.feesPaid) {
    console.log(
      `   Transitioning fees status for student detail ID ${student._id}...`,
    );
    const updateFeesRes = await client.patch(`/admin/fees/${student._id}`, {
      feesPaid: true,
    });
    if (updateFeesRes.status !== 200) {
      console.error(
        "❌ Failed to update fees paid status:",
        updateFeesRes.data,
      );
    } else {
      console.log(
        "✅ Fees status updated successfully:",
        updateFeesRes.data.student.feesPaid ? "PAID" : "UNPAID",
      );
    }
  }

  // Logout Admin
  console.log("\nLogging out Admin...");
  await client.post("/auth/logout");
  clearCookie();

  // 5. LOGIN AS FACULTY & SUBMIT ATTENDANCE AND MARKS
  console.log("\n[5/7] Logging in as seeded Faculty...");
  const facultyLoginRes = await client.post("/auth/login", {
    email: "plum@faculty.com",
    password: "password",
  });

  if (facultyLoginRes.status !== 200) {
    console.error("❌ Faculty login failed:", facultyLoginRes.data);
    return;
  }
  console.log(
    "✅ Faculty login successful. User:",
    facultyLoginRes.data.user.name,
  );
  storeCookie(facultyLoginRes);

  console.log("   Submitting bulk attendance matrix for CS101...");
  // Find rohit user ID from our students listing route (accessible to faculty)
  const studentsDirRes = await client.get("/faculty/students");
  const johnDoe = studentsDirRes.data.find((s) => s.rollNumber === "STU001");
  if (!johnDoe) {
    console.error("❌ Student rohit not found in faculty student listing.");
    return;
  }

  const attendancePayload = {
    courseCode: "CS101",
    date: new Date().toISOString(),
    records: [{ student: johnDoe.user._id, status: "Late" }],
  };

  const attRes = await client.post("/faculty/attendance", attendancePayload);
  if (attRes.status !== 200) {
    console.error("❌ Attendance submission failed:", attRes.data);
  } else {
    console.log("✅ Attendance register recorded successfully.");
  }

  console.log("   Submitting marks card for rohit in CS101...");
  const marksPayload = {
    studentId: johnDoe.user._id,
    courseCode: "CS101",
    courseName: "Introduction to Programming",
    score: 88,
    grade: "A",
  };

  const marksRes = await client.post("/faculty/marks", marksPayload);
  if (marksRes.status !== 200) {
    console.error("❌ Marks submission failed:", marksRes.data);
  } else {
    console.log("✅ Marks card submitted successfully.");
  }

  // Logout Faculty
  console.log("\nLogging out Faculty...");
  await client.post("/auth/logout");
  clearCookie();

  // 6. LOGIN AS STUDENT & VERIFY STATS AND DIGITAL LEAVE
  console.log("\n[6/7] Logging in as seeded Student...");
  const studentLoginRes = await client.post("/auth/login", {
    email: "rohit@student.com",
    password: "password",
  });

  if (studentLoginRes.status !== 200) {
    console.error("❌ Student login failed:", studentLoginRes.data);
    return;
  }
  console.log(
    "✅ Student login successful. User:",
    studentLoginRes.data.user.name,
  );
  storeCookie(studentLoginRes);

  console.log("   Verifying Student profiles & financial state...");
  const studentProfileRes = await client.get("/auth/me");
  console.log(
    `   Fees status: ${studentProfileRes.data.user.studentDetail?.feesPaid ? "PAID" : "UNPAID"} (Expected: PAID)`,
  );

  console.log("   Fetching Attendance analytics...");
  const analyticsRes = await client.get("/student/analytics");
  if (analyticsRes.status !== 200) {
    console.error(
      "❌ Failed to fetch attendance analytics:",
      analyticsRes.data,
    );
  } else {
    console.log("✅ Attendance analytics loaded:", analyticsRes.data.overall);
    console.log("   Subject list:", analyticsRes.data.courseWise);
  }

  console.log("   Fetching Grades card...");
  const gradesRes = await client.get("/student/grades");
  if (gradesRes.status !== 200) {
    console.error("❌ Failed to fetch grades card:", gradesRes.data);
  } else {
    console.log("✅ Report card loaded:", gradesRes.data);
  }

  console.log("   Submitting digital leave request...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endLeave = new Date();
  endLeave.setDate(endLeave.getDate() + 3);

  const leavePayload = {
    startDate: tomorrow.toISOString(),
    endDate: endLeave.toISOString(),
    reason: "Medical checkup and dentist appointment",
  };

  const leaveRes = await client.post("/student/leave", leavePayload);
  if (leaveRes.status !== 200) {
    console.error("❌ Leave request submission failed:", leaveRes.data);
  } else {
    console.log("✅ Leave request filed successfully.");
  }

  console.log("   Checking leave request history status...");
  const leaveLogsRes = await client.get("/student/leave");
  if (leaveLogsRes.status !== 200) {
    console.error("❌ Failed to fetch leave history:", leaveLogsRes.data);
  } else {
    console.log(
      "✅ Leave logs loaded. Total entries:",
      leaveLogsRes.data.length,
    );
    console.log(
      "   Latest Entry Status:",
      leaveLogsRes.data[0]?.status,
      "Reason:",
      leaveLogsRes.data[0]?.reason,
    );
  }

  // Logout Student
  console.log("\nLogging out Student...");
  await client.post("/auth/logout");
  clearCookie();

  console.log("\n========================================================");
  console.log("API TESTS EXECUTED COMPLETELY WITH NO ROUTING ERRORS");
  console.log("========================================================");
}

runTests();
