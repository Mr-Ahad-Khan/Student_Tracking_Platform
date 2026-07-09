import { useState, useEffect } from 'react';
import { Upload, DollarSign, Check, AlertCircle, FileText, Search, CreditCard } from 'lucide-react';
import api from '../utils/api.js';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('csv');
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search/Filter ledger state
  const [searchQuery, setSearchQuery] = useState('');

  // CSV Upload State
  const [file, setFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadStats, setUploadStats] = useState(null);
  const [submittingFile, setSubmittingFile] = useState(false);

  const fetchLedger = async () => {
    try {
      const response = await api.get('/admin/fees');
      setLedger(response.data);
    } catch (err) {
      console.error('Failed to load fee status ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadLedger = async () => {
      try {
        const response = await api.get('/admin/fees');
        if (isMounted) {
          setLedger(response.data);
        }
      } catch (err) {
        console.error('Failed to load fee status ledger:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLedger();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'text/csv') {
      setFile(selected);
      setUploadError('');
    } else {
      setFile(null);
      setUploadError('Please select a valid CSV file.');
    }
  };

  const handleCSVSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    setUploadStats(null);

    if (!file) {
      setUploadError('Please choose a file to upload first.');
      return;
    }

    setSubmittingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/admin/upload-users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadSuccess(response.data.message);
      setUploadStats({
        successCount: response.data.successCount,
        failCount: response.data.failCount,
        errors: response.data.errors || [],
      });
      setFile(null);
      
      // Reset file input element
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) { fileInput.value = ''; }

      // Reload ledger as students were added/updated
      fetchLedger();
    } catch (err) {
      setUploadError(
        err.response?.data?.message ||
        'An error occurred during file upload. Verify CSV format.'
      );
    } finally {
      setSubmittingFile(false);
    }
  };

  const handleToggleFees = async (studentId, currentFeesPaid) => {
    try {
      const response = await api.patch(`/admin/fees/${studentId}`, {
        feesPaid: !currentFeesPaid,
      });

      // Update local state ledger list
      setLedger((prevLedger) =>
        prevLedger.map((student) =>
          student._id === studentId ? response.data.student : student
        )
      );
    } catch (err) {
      console.error('Failed to toggle fees status:', err);
    }
  };

  // Filter ledger list based on search query
  const filteredLedger = ledger.filter((student) => {
    const studentName = student.user?.name?.toLowerCase() || '';
    const studentEmail = student.user?.email?.toLowerCase() || '';
    const roll = student.rollNumber?.toLowerCase() || '';
    const dept = student.department?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    return (
      studentName.includes(query) ||
      studentEmail.includes(query) ||
      roll.includes(query) ||
      dept.includes(query)
    );
  });

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
          Superuser Console
        </span>
        <h2 className="text-2xl md:text-3xl font-bold mt-2">Welcome, {user.name}!</h2>
        <p className="text-blue-100 mt-1 opacity-90 text-sm md:text-base">
          Root management console for database seeding imports, and financial clearance tracking.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('csv')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'csv'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          CSV Database Seeding
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-all ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Student Financial Ledger
        </button>
      </div>

      {/* View Sections */}
      {activeTab === 'csv' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Upload className="text-blue-600 h-5 w-5" />
              <h3 className="font-semibold text-slate-800 text-lg">CSV Bulk Profile Import</h3>
            </div>

            <form onSubmit={handleCSVSubmit} className="space-y-6">
              {uploadError && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold">
                  {uploadSuccess}
                </div>
              )}

              {/* Custom Drag Drop input Zone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 hover:bg-slate-50">
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {file ? file.name : 'Click to select CSV File'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Only standard UTF-8 CSV files supported'}
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingFile || !file}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {submittingFile && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />}
                  Execute User Seed
                </button>
              </div>
            </form>

            {/* Upload Stats */}
            {uploadStats && (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <h4 className="font-semibold text-slate-800 text-sm">Execution Run Summary:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-800">{uploadStats.successCount}</p>
                    <p className="text-xs text-emerald-600 font-semibold uppercase">Imported Successfully</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl">
                    <p className="text-2xl font-bold text-rose-800">{uploadStats.failCount}</p>
                    <p className="text-xs text-rose-600 font-semibold uppercase">Skipped / Failed</p>
                  </div>
                </div>

                {uploadStats.errors.length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Execution Warnings:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-slate-600">
                      {uploadStats.errors.map((err, idx) => (
                        <p key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                          <span className="text-rose-500">•</span> {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guidelines info card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <FileText className="text-blue-600 h-5 w-5" />
                <h3 className="font-semibold text-slate-800 text-lg">CSV Specifications</h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                The database seeder expects a specific row layout header. Download the template layout below or use this structured order:
              </p>

              <div className="p-3 bg-slate-50 font-mono text-[10px] text-slate-600 border border-slate-100 rounded-xl overflow-x-auto select-all leading-normal">
                name,email,password,role,rollNumber,department,semester<br />
                Ahad Student,ahad@student.com,password,student,STU02,Computer Science,4<br />
                Dr. Ahad Faculty,ahad@faculty.com,password,faculty,,,
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Passwords are automatically hashed
                </p>
                <p className="flex items-center gap-2 font-semibold">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Supported roles: admin, faculty, student
                </p>
                <p className="flex items-center gap-2 font-semibold">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Roll, Dept, Sem required only for student role
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="text-blue-600 h-5 w-5" />
              <h3 className="font-semibold text-slate-800 text-lg">Financial Clearance Ledger</h3>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search roll, name, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            {filteredLedger.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-400 font-semibold uppercase">
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Student Info</th>
                    <th className="p-4">Department / Sem</th>
                    <th className="p-4 text-center">Fees Cleared</th>
                    <th className="p-4 text-right">Ledger Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLedger.map((student) => {
                    const studentUser = student.user || { name: 'Unknown', email: 'N/A' };
                    return (
                      <tr key={student._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{student.rollNumber}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-slate-700">{studentUser.name}</p>
                            <p className="text-xs text-slate-400">{studentUser.email}</p>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-xs font-semibold">
                          {student.department} / Sem {student.semester}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            student.feesPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {student.feesPaid ? (
                              <>
                                <Check className="h-3 w-3" /> Paid
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 animate-pulse" /> Unpaid
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleFees(student._id, student.feesPaid)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm border transition-all inline-flex items-center gap-1.5 ${
                              student.feesPaid
                                ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            {student.feesPaid ? 'Mark Unpaid' : 'Collect Fees'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                No matched records found in ledger directory.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
