import { useState, useEffect } from 'react';
import { ClipboardList, Award, CheckCircle, XCircle, Sparkles, FileSpreadsheet } from 'lucide-react';
import api from '../utils/api.js';

export default function FacultyDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('attendance');
  const [students, setStudents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Attendance Submission State
  const [courseCode, setCourseCode] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // studentUserId -> status
  const [attendanceSuccess, setAttendanceSuccess] = useState('');
  const [attendanceError, setAttendanceError] = useState('');
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Marks Submission State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [marksCourseCode, setMarksCourseCode] = useState('');
  const [marksCourseName, setMarksCourseName] = useState('');
  const [score, setScore] = useState('');
  const [grade, setGrade] = useState('');
  const [marksSuccess, setMarksSuccess] = useState('');
  const [marksError, setMarksError] = useState('');
  const [submittingMarks, setSubmittingMarks] = useState(false);

  // Fetch student directories and leave applications
  const loadDashboardData = async () => {
    try {
      const [studentsRes, leavesRes] = await Promise.all([
        api.get('/faculty/students'),
        api.get('/admin/leaves'), // Shared utility route
      ]);
      setStudents(studentsRes.data);
      setLeaves(leavesRes.data);

      // Initialize all student attendance records to "Present" by default
      const initialRecords = {};
      studentsRes.data.forEach((student) => {
        if (student.user) {
          initialRecords[student.user._id] = 'Present';
        }
      });
      setAttendanceRecords(initialRecords);
    } catch (err) {
      console.error('Error loading faculty dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialDashboardData = async () => {
      try {
        const [studentsRes, leavesRes] = await Promise.all([
          api.get('/faculty/students'),
          api.get('/admin/leaves'),
        ]);

        if (!isMounted) {
          return;
        }

        setStudents(studentsRes.data);
        setLeaves(leavesRes.data);

        const initialRecords = {};
        studentsRes.data.forEach((student) => {
          if (student.user) {
            initialRecords[student.user._id] = 'Present';
          }
        });
        setAttendanceRecords(initialRecords);
      } catch (err) {
        console.error('Error loading faculty dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time Auto Grade calculation
  const calculateGrade = (val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      return '';
    }
    if (num >= 90) {
      return 'A+';
    }
    if (num >= 80) {
      return 'A';
    }
    if (num >= 70) {
      return 'B';
    }
    if (num >= 60) {
      return 'C';
    }
    if (num >= 50) {
      return 'D';
    }
    return 'F';
  };

  const handleScoreChange = (e) => {
    const val = e.target.value;
    setScore(val);
    setGrade(calculateGrade(val));
  };

  // Bulk set attendance status helper
  const handleBulkSetAttendance = (status) => {
    const updated = { ...attendanceRecords };
    students.forEach((student) => {
      if (student.user) {
        updated[student.user._id] = status;
      }
    });
    setAttendanceRecords(updated);
  };

  const handleIndividualAttendanceChange = (studentUserId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentUserId]: status,
    }));
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setAttendanceError('');
    setAttendanceSuccess('');
    setSubmittingAttendance(true);

    if (!courseCode) {
      setAttendanceError('Course Code is required.');
      setSubmittingAttendance(false);
      return;
    }

    const recordsPayload = Object.keys(attendanceRecords).map((studentUserId) => ({
      student: studentUserId,
      status: attendanceRecords[studentUserId],
    }));

    if (recordsPayload.length === 0) {
      setAttendanceError('No student records to register.');
      setSubmittingAttendance(false);
      return;
    }

    try {
      await api.post('/faculty/attendance', {
        courseCode: courseCode.trim().toUpperCase(),
        date: attendanceDate,
        records: recordsPayload,
      });
      setAttendanceSuccess('Bulk attendance recorded successfully.');
    } catch (err) {
      setAttendanceError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Failed to submit attendance.');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const handleMarksSubmit = async (e) => {
    e.preventDefault();
    setMarksError('');
    setMarksSuccess('');
    setSubmittingMarks(true);

    if (!selectedStudent || !marksCourseCode || !marksCourseName || !score || !grade) {
      setMarksError('All marks fields are required.');
      setSubmittingMarks(false);
      return;
    }

    try {
      await api.post('/faculty/marks', {
        studentId: selectedStudent,
        courseCode: marksCourseCode.trim().toUpperCase(),
        courseName: marksCourseName.trim(),
        score: parseInt(score, 10),
        grade,
      });
      setMarksSuccess('Marks submitted successfully.');
      setSelectedStudent('');
      setMarksCourseCode('');
      setMarksCourseName('');
      setScore('');
      setGrade('');
      // Reload student details to fetch updated grades if necessary
      loadDashboardData();
    } catch (err) {
      setMarksError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Failed to submit marks.');
    } finally {
      setSubmittingMarks(false);
    }
  };

  const handleLeaveDecision = async (leaveId, decision) => {
    try {
      await api.patch(`/admin/leaves/${leaveId}`, { status: decision });
      // Reload leaves from API
      const leavesRes = await api.get('/admin/leaves');
      setLeaves(leavesRes.data);
    } catch (err) {
      console.error('Leave review action failed:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 md:p-8 shadow-lg">
        <span className="bg-blue-500/30 text-blue-100 font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
          Faculty Console
        </span>
        <h2 className="text-2xl md:text-3xl font-bold mt-2">Welcome, {user.name}!</h2>
        <p className="text-blue-100 mt-1 opacity-90 text-sm md:text-base">
          Class portal for managing student attendance registers, scorecards, and request boards.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Attendance Register
        </button>
        <button
          onClick={() => setActiveTab('marks')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'marks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Submit Marks
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all relative ${
            activeTab === 'leaves'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Leave Applications
          {leaves.filter(l => l.status === 'Pending').length > 0 && (
            <span className="absolute -top-1.5 -right-3 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">
              {leaves.filter(l => l.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Sub Views */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <ClipboardList className="text-blue-600 h-5 w-5" />
            <h3 className="font-semibold text-slate-800 text-lg">Class Attendance Grid</h3>
          </div>

          <form onSubmit={handleAttendanceSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101, MAT202"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Date</label>
                <input
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Quick Bulk Utilities */}
            <div className="flex flex-wrap gap-2 pt-2 items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Bulk Actions:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkSetAttendance('Present')}
                  className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetAttendance('Late')}
                  className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Mark All Late
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetAttendance('Absent')}
                  className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-100 transition-colors"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {attendanceError && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {attendanceError}
              </div>
            )}
            {attendanceSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold">
                {attendanceSuccess}
              </div>
            )}

            {/* Grid Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              {students.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-400 font-semibold uppercase">
                      <th className="p-4">Roll Number</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Department / Sem</th>
                      <th className="p-4 text-center">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {students.map((student) => {
                      if (!student.user) { return null; }
                      const userId = student.user._id;
                      const status = attendanceRecords[userId] || 'Present';
                      return (
                        <tr key={student._id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{student.rollNumber}</td>
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-slate-700">{student.user.name}</p>
                              <p className="text-xs text-slate-400">{student.user.email}</p>
                            </div>
                          </td>
                          <td className="p-4 text-slate-500 text-xs font-medium">
                            {student.department} / Sem {student.semester}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleIndividualAttendanceChange(userId, 'Present')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  status === 'Present'
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleIndividualAttendanceChange(userId, 'Late')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  status === 'Late'
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => handleIndividualAttendanceChange(userId, 'Absent')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  status === 'Absent'
                                    ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No students in the platform directory yet. Seed or import students first.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingAttendance || students.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submittingAttendance && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />}
                Submit Class Register
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'marks' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Award className="text-blue-600 h-5 w-5" />
            <h3 className="font-semibold text-slate-800 text-lg">Submit Course Grades</h3>
          </div>

          <form onSubmit={handleMarksSubmit} className="space-y-6 max-w-2xl">
            {marksError && (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {marksError}
              </div>
            )}
            {marksSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold">
                {marksSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Select Student</label>
              <select
                required
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">-- Choose Student --</option>
                {students.map((student) => {
                  if (!student.user) { return null; }
                  return (
                    <option key={student._id} value={student.user._id}>
                      {student.rollNumber} - {student.user.name} ({student.department})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101"
                  value={marksCourseCode}
                  onChange={(e) => setMarksCourseCode(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Organization"
                  value={marksCourseName}
                  onChange={(e) => setMarksCourseName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Score (0-100)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  placeholder="85"
                  value={score}
                  onChange={handleScoreChange}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                  Auto Grade <Sparkles className="h-3 w-3 text-indigo-500" />
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="Grade"
                  value={grade}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 font-bold text-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submittingMarks}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submittingMarks && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />}
                Submit Marks Card
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <FileSpreadsheet className="text-blue-600 h-5 w-5" />
            <h3 className="font-semibold text-slate-800 text-lg">Leave Request Board</h3>
          </div>

          <div className="overflow-x-auto">
            {leaves.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-400 font-semibold uppercase">
                    <th className="p-4">Student</th>
                    <th className="p-4">Date Range</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {leaves.map((leave) => {
                    const start = new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    const end = new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <tr key={leave._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-bold text-slate-800">
                          {leave.student ? leave.student.name : 'Unknown User'}
                          <span className="block text-xs font-normal text-slate-400">
                            {leave.student ? leave.student.email : ''}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-semibold text-xs whitespace-nowrap">
                          {start} - {end}
                        </td>
                        <td className="p-4 text-slate-500 max-w-[240px] truncate" title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                            leave.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {leave.status === 'Pending' ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleLeaveDecision(leave._id, 'Approved')}
                                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleLeaveDecision(leave._id, 'Rejected')}
                                className="px-3 py-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Decision Made</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                No leave requests filed on the platform.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
