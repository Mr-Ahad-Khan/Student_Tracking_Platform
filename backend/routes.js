import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { User, StudentDetail, Attendance, LeaveRequest } from './models.js';
import { authenticate, authorize, validateBody } from './middleware.js';
import {
  loginSchema,
  attendanceSchema,
  marksSchema,
  leaveRequestSchema,
  feesUpdateSchema,
} from './validation.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper to parse CSV file using standard streams wrapped in a Promise
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// @route   POST /api/auth/login
// @desc    Authenticate user and set cookie with JWT
router.post('/auth/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    // Locate user and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allow cookie sharing in dev
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Clear cookies and sign out user
router.post('/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

// @route   GET /api/auth/me
// @desc    Retrieve logged-in user profile
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    const userObj = req.user.toObject();

    if (req.user.role === 'student') {
      const details = await StudentDetail.findOne({ user: req.user._id });
      userObj.studentDetail = details;
    }

    res.json({ user: userObj });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user data', error: error.message });
  }
});


// ==========================================
// ADMIN ROUTES
// ==========================================

// @route   POST /api/admin/upload-users
// @desc    Bulk upload users using a CSV Parser
router.post(
  '/admin/upload-users',
  authenticate,
  authorize('admin'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please upload a CSV file.' });
    }

    try {
      const records = await parseCSVFile(req.file.path);
      const importedUsers = [];
      const errors = [];

      for (const [index, record] of records.entries()) {
        const { name, email, password, role, rollNumber, department, semester } = record;

        // Core fields validation
        if (!name || !email || !password || !role) {
          errors.push(`Row ${index + 1}: Missing name, email, password, or role.`);
          continue;
        }

        const normalizedRole = role.trim().toLowerCase();
        if (!['admin', 'faculty', 'student'].includes(normalizedRole)) {
          errors.push(`Row ${index + 1}: Invalid role "${role}".`);
          continue;
        }

        try {
          // Check if user already exists
          let user = await User.findOne({ email: email.trim().toLowerCase() });
          if (!user) {
            user = new User({
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password: password.trim(),
              role: normalizedRole,
            });
            await user.save();
          } else {
            // Update basic info
            user.name = name.trim();
            user.role = normalizedRole;
            await user.save();
          }

          // If role is student, create/update student details
          if (normalizedRole === 'student') {
            if (!rollNumber || !department || !semester) {
              errors.push(`Row ${index + 1}: Student missing rollNumber, department, or semester.`);
              continue;
            }

            let studentDetail = await StudentDetail.findOne({ user: user._id });
            if (!studentDetail) {
              studentDetail = new StudentDetail({
                user: user._id,
                rollNumber: rollNumber.trim(),
                department: department.trim(),
                semester: parseInt(semester, 10),
              });
            } else {
              studentDetail.rollNumber = rollNumber.trim();
              studentDetail.department = department.trim();
              studentDetail.semester = parseInt(semester, 10);
            }
            await studentDetail.save();
          }

          importedUsers.push(user.email);
        } catch (dbErr) {
          errors.push(`Row ${index + 1} db-error: ${dbErr.message}`);
        }
      }

      res.json({
        message: `Import complete. Successfully processed ${importedUsers.length} records.`,
        successCount: importedUsers.length,
        failCount: errors.length,
        errors,
      });
    } catch (csvError) {
      res.status(500).json({ message: 'Error parsing CSV file', error: csvError.message });
    } finally {
      // Always cleanup uploaded files
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error cleaning up CSV upload file:', err.message);
      }
    }
  }
);

// @route   GET /api/admin/fees
// @desc    Retrieve fees status ledger for all students
router.get('/admin/fees', authenticate, authorize('admin'), async (req, res) => {
  try {
    const students = await StudentDetail.find()
      .populate('user', 'name email')
      .sort({ rollNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve fee ledger', error: error.message });
  }
});

// @route   PATCH /api/admin/fees/:studentId
// @desc    Update fees paid status for a student (takes student details ID)
router.patch(
  '/admin/fees/:studentId',
  authenticate,
  authorize('admin'),
  validateBody(feesUpdateSchema),
  async (req, res) => {
    try {
      const { feesPaid } = req.body;
      const student = await StudentDetail.findByIdAndUpdate(
        req.params.studentId,
        { feesPaid },
        { new: true }
      ).populate('user', 'name email');

      if (!student) {
        return res.status(404).json({ message: 'Student details record not found' });
      }

      res.json({ message: 'Fee status updated successfully', student });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update fee status', error: error.message });
    }
  }
);


// ==========================================
// FACULTY ROUTES
// ==========================================

// @route   POST /api/faculty/attendance
// @desc    Submit bulk attendance matrices for specific dates
router.post(
  '/faculty/attendance',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(attendanceSchema),
  async (req, res) => {
    const { courseCode, date, records } = req.body;

    try {
      // Normalize date to start of day UTC
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      // Perform upsert (update if exists, insert if new)
      const attendance = await Attendance.findOneAndUpdate(
        { courseCode, date: normalizedDate },
        { records },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ message: 'Attendance registered successfully', attendance });
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit attendance', error: error.message });
    }
  }
);

// @route   POST /api/faculty/marks
// @desc    Submit or update marks/grades for a student
router.post(
  '/faculty/marks',
  authenticate,
  authorize('faculty', 'admin'),
  validateBody(marksSchema),
  async (req, res) => {
    const { studentId, courseCode, courseName, score, grade } = req.body;

    try {
      // Find StudentDetail by student user ID
      const studentDetail = await StudentDetail.findOne({ user: studentId });
      if (!studentDetail) {
        return res.status(404).json({ message: 'Student detail records not found for this user.' });
      }

      const existingMarkIndex = studentDetail.marks.findIndex(
        (m) => m.courseCode === courseCode
      );

      if (existingMarkIndex > -1) {
        // Update existing course mark
        studentDetail.marks[existingMarkIndex].score = score;
        studentDetail.marks[existingMarkIndex].grade = grade;
        studentDetail.marks[existingMarkIndex].courseName = courseName;
      } else {
        // Add new course mark
        studentDetail.marks.push({ courseCode, courseName, score, grade });
      }

      await studentDetail.save();
      res.json({ message: 'Marks updated successfully', marks: studentDetail.marks });
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit marks', error: error.message });
    }
  }
);


// ==========================================
// STUDENT ROUTES
// ==========================================

// @route   GET /api/student/analytics
// @desc    Retrieve individual attendance analytics
router.get('/student/analytics', authenticate, authorize('student'), async (req, res) => {
  try {
    const attendanceSheets = await Attendance.find({
      'records.student': req.user._id,
    });

    const courseWise = {};
    let totalConducted = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    attendanceSheets.forEach((sheet) => {
      const code = sheet.courseCode;
      if (!courseWise[code]) {
        courseWise[code] = { total: 0, present: 0, absent: 0, late: 0 };
      }

      const record = sheet.records.find(
        (r) => r.student.toString() === req.user._id.toString()
      );

      if (record) {
        courseWise[code].total += 1;
        totalConducted += 1;

        if (record.status === 'Present') {
          courseWise[code].present += 1;
          totalPresent += 1;
        } else if (record.status === 'Absent') {
          courseWise[code].absent += 1;
          totalAbsent += 1;
        } else if (record.status === 'Late') {
          courseWise[code].late += 1;
          totalLate += 1;
        }
      }
    });

    // Compute course-specific percentages
    const courseWiseList = Object.keys(courseWise).map((code) => {
      const { total, present, absent, late } = courseWise[code];
      // Late counts as present in terms of attendance count, but we track it separately
      const attended = present + late;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
      return {
        courseCode: code,
        total,
        present,
        absent,
        late,
        percentage: pct,
      };
    });

    const overallAttended = totalPresent + totalLate;
    const overallPercentage =
      totalConducted > 0 ? Math.round((overallAttended / totalConducted) * 100) : 0;

    res.json({
      overall: {
        totalConducted,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        percentage: overallPercentage,
      },
      courseWise: courseWiseList,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to compute attendance analytics', error: error.message });
  }
});

// @route   GET /api/student/grades
// @desc    Retrieve student marks and grades
router.get('/student/grades', authenticate, authorize('student'), async (req, res) => {
  try {
    const studentDetail = await StudentDetail.findOne({ user: req.user._id });
    res.json(studentDetail ? studentDetail.marks : []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve grades', error: error.message });
  }
});

// @route   POST /api/student/leave
// @desc    Submit a digital leave request
router.post(
  '/student/leave',
  authenticate,
  authorize('student'),
  validateBody(leaveRequestSchema),
  async (req, res) => {
    const { startDate, endDate, reason } = req.body;

    try {
      const leave = new LeaveRequest({
        student: req.user._id,
        startDate,
        endDate,
        reason,
      });

      await leave.save();
      res.json({ message: 'Leave request submitted successfully', leave });
    } catch (error) {
      res.status(500).json({ message: 'Failed to submit leave request', error: error.message });
    }
  }
);

// @route   GET /api/student/leave
// @desc    Retrieve leave requests submitted by the student
router.get('/student/leave', authenticate, authorize('student'), async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leave request logs', error: error.message });
  }
});


// ==========================================
// ADDITIONAL UTILITY ROUTES FOR WORKFLOWS
// ==========================================

// @route   GET /api/admin/leaves
// @desc    Retrieve all leave requests for admin/faculty review
router.get('/admin/leaves', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const leaves = await LeaveRequest.find()
      .populate('student', 'name email')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve leave requests', error: error.message });
  }
});

// @route   PATCH /api/admin/leaves/:leaveId
// @desc    Approve or reject a leave request
router.patch('/admin/leaves/:leaveId', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Choose Approved or Rejected.' });
  }

  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.leaveId,
      { status },
      { new: true }
    ).populate('student', 'name email');

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    res.json({ message: `Leave request status updated to ${status}`, leave });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update leave request', error: error.message });
  }
});

// @route   GET /api/faculty/students
// @desc    Get a list of all students (with details) for class selection, attendance grids, etc.
router.get('/faculty/students', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const students = await StudentDetail.find().populate('user', 'name email');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student directory', error: error.message });
  }
});

export default router;
