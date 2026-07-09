import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema (Base credentials and identity details)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false, // Exclude password from query results by default
  },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'student'],
    default: 'student',
  },
}, {
  timestamps: true,
});

// Pre-save hook to hash user password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password match
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Student Details Schema (Extension for student roles)
const studentDetailSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester cannot be less than 1'],
  },
  feesPaid: {
    type: Boolean,
    default: false,
  },
  marks: [{
    courseCode: {
      type: String,
      required: true,
    },
    courseName: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      required: true,
    },
  }],
}, {
  timestamps: true,
});

// Attendance Schema (Maps course and date to student statuses)
const attendanceSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Course code is required'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  records: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late'],
      default: 'Present',
    },
  }],
}, {
  timestamps: true,
});

// Prevent duplicate attendance for the same course on the same day
attendanceSchema.index({ courseCode: 1, date: 1 }, { unique: true });

// Leave Request Schema (For students to request leave digitally)
const leaveRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  reason: {
    type: String,
    required: [true, 'Reason for leave is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
}, {
  timestamps: true,
});

export const User = mongoose.model('User', userSchema);
export const StudentDetail = mongoose.model('StudentDetail', studentDetailSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
