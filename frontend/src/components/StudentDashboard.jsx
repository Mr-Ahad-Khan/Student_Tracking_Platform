import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Calendar, Award, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../utils/api.js';

const COLORS = ['#10B981', '#EF4444', '#F59E0B']; // Green (Present), Red (Absent), Yellow (Late)

export default function StudentDashboard({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [grades, setGrades] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [analyticsRes, gradesRes, leavesRes] = await Promise.all([
          api.get('/student/analytics'),
          api.get('/student/grades'),
          api.get('/student/leave'),
        ]);

        if (!isMounted) {
          return;
        }

        setAnalytics(analyticsRes.data);
        setGrades(gradesRes.data);
        setLeaves(leavesRes.data);
      } catch (err) {
        console.error('Error fetching student dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    if (!startDate || !endDate || !reason) {
      setFormError('Please fill out all fields.');
      setSubmitting(false);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('End date cannot be earlier than start date.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/student/leave', { startDate, endDate, reason });
      setFormSuccess('Leave request submitted successfully.');
      setStartDate('');
      setEndDate('');
      setReason('');
      // Refresh leaves list
      const leavesRes = await api.get('/student/leave');
      setLeaves(leavesRes.data);
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const overall = analytics?.overall || { totalConducted: 0, present: 0, absent: 0, late: 0, percentage: 0 };
  const courseWise = analytics?.courseWise || [];

  // Pie chart data formatting
  const pieData = [
    { name: 'Present', value: overall.present },
    { name: 'Absent', value: overall.absent },
    { name: 'Late', value: overall.late },
  ].filter(item => item.value > 0);

  const studentDetail = user.studentDetail || {};

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Student Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-blue-500/30 text-blue-100 font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
            Student Account
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mt-2">Welcome back, {user.name}!</h2>
          <p className="text-blue-100 mt-1 opacity-90 text-sm md:text-base">
            Roll No: {studentDetail.rollNumber || 'N/A'} • {studentDetail.department || 'N/A'} • Semester {studentDetail.semester || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Fees Status</p>
            <p className="text-lg font-bold">
              {studentDetail.feesPaid ? 'Paid' : 'Pending'}
            </p>
          </div>
          <span className={`w-3.5 h-3.5 rounded-full ${studentDetail.feesPaid ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overall Stats Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-between min-h-[340px]">
          <div className="w-full text-left">
            <h3 className="font-semibold text-slate-800 text-lg">Overall Attendance</h3>
            <p className="text-xs text-slate-500">Conduct summary & status ratio</p>
          </div>

          {pieData.length > 0 ? (
            <div className="w-full h-48 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => {
                      const colorIndex = entry.name === 'Present' ? 0 : entry.name === 'Absent' ? 1 : 2;
                      return <Cell key={`cell-${index}`} fill={COLORS[colorIndex]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Class(es)`, 'Status']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-slate-800">{overall.percentage}%</span>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Attended</p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              No attendance data available.
            </div>
          )}

          {/* Quick Stats Legend */}
          <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-slate-50 text-center text-xs">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
              <p className="font-bold text-base">{overall.present}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Present</p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
              <p className="font-bold text-base">{overall.late}</p>
              <p className="text-[10px] text-amber-600 font-medium">Late</p>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-800">
              <p className="font-bold text-base">{overall.absent}</p>
              <p className="text-[10px] text-rose-600 font-medium">Absent</p>
            </div>
          </div>
        </div>

        {/* Course-wise Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 min-h-[340px] flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">Course-wise Breakdown</h3>
            <p className="text-xs text-slate-500">Attendance percentages per enrolled subject</p>
          </div>

          {courseWise.length > 0 ? (
            <div className="w-full h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseWise} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="courseCode" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                  <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {courseWise.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.percentage >= 75 ? '#10B981' : entry.percentage >= 50 ? '#F59E0B' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm">
              No class analytics registered yet.
            </div>
          )}

          <div className="text-[10px] text-slate-400 flex items-center justify-end gap-3 font-semibold mt-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &gt;= 75%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 50-74%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt; 50%</span>
          </div>
        </div>
      </div>

      {/* Grades Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
          <Award className="text-blue-600 h-5 w-5" />
          <h3 className="font-semibold text-slate-800 text-lg">Academic Report Card</h3>
        </div>

        {grades.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grades.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center hover:shadow-sm transition-all">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.courseCode}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{item.courseName}</p>
                  <p className="text-xs text-slate-500 mt-2">Score: <span className="font-semibold text-slate-700">{item.score}/100</span></p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg border border-slate-100 shadow-sm">
                  <span className="text-lg font-black text-blue-600">{item.grade}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            No grades submitted yet for this semester.
          </div>
        )}
      </div>

      {/* Digital Leave Request & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Calendar className="text-blue-600 h-5 w-5" />
              <h3 className="font-semibold text-slate-800 text-lg">Digital Leave Application</h3>
            </div>

            <form onSubmit={handleRequestLeave} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reason for Leave</label>
                <textarea
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for your leave request..."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {submitting ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>

        {/* Leave Request Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <FileText className="text-blue-600 h-5 w-5" />
              <h3 className="font-semibold text-slate-800 text-lg">Leave Status Logs</h3>
            </div>

            <div className="overflow-x-auto">
              {leaves.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase">
                      <th className="pb-3">Duration</th>
                      <th className="pb-3">Reason</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
                    {leaves.map((item, idx) => {
                      const start = new Date(item.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      const end = new Date(item.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 pr-2 font-medium text-slate-700">
                            {start} - {end}
                          </td>
                          <td className="py-3.5 pr-2 text-slate-500 max-w-[200px] truncate" title={item.reason}>
                            {item.reason}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                              item.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {item.status === 'Approved' && <CheckCircle className="h-3 w-3" />}
                              {item.status === 'Rejected' && <AlertTriangle className="h-3 w-3" />}
                              {item.status === 'Pending' && <Clock className="h-3 w-3 animate-pulse" />}
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No leave requests logged.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
