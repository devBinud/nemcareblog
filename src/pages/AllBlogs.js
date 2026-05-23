import React, { useEffect, useState } from 'react';
import { FiTrash2, FiEdit3, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { ToastContainer } from '../components/Toast';
import useToast from '../hooks/useToast';

const API_URL = 'https://api.nemcare.com/api/blogs';

const capitalizeWords = (str) => {
  if (!str) return 'N/A';
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getCategoryBadge = (category) => {
  const cleanCat = category?.toLowerCase() || '';
  const formattedCat = capitalizeWords(category);
  let classes = 'bg-slate-50 text-slate-650 border-slate-200/50';

  if (cleanCat.includes('cardio')) {
    classes = 'bg-blue-50/70 text-blue-600 border-blue-100/20';
  } else if (cleanCat.includes('surg') || cleanCat.includes('recov')) {
    classes = 'bg-rose-50/70 text-rose-600 border-rose-100/20';
  } else if (cleanCat.includes('pediat')) {
    classes = 'bg-violet-50/70 text-violet-655 border-violet-100/20';
  } else if (cleanCat.includes('health') || cleanCat.includes('test')) {
    classes = 'bg-emerald-50/70 text-emerald-600 border-emerald-100/20';
  } else if (cleanCat.includes('tech')) {
    classes = 'bg-indigo-50/70 text-indigo-600 border-indigo-100/20';
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border tracking-wide inline-block ${classes}`}>
      {formattedCat}
    </span>
  );
};

const AllBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 5;
  const { toasts, removeToast, success, error } = useToast();

  const fetchBlogs = async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      setBlogs(json.data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm('Are you sure you want to delete this blog?');
    if (!confirm) return;
    try {
      const res = await apiFetch(`/blogs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to delete');
      }
      setBlogs(prev => prev.filter(blog => blog.id !== id));
      success('Blog deleted successfully');
    } catch (err) {
      console.error('Error deleting blog:', err);
      error(err.message || 'Failed to delete blog');
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const totalPages = Math.ceil(blogs.length / blogsPerPage);
  const indexOfLast = currentPage * blogsPerPage;
  const indexOfFirst = indexOfLast - blogsPerPage;
  const currentBlogs = blogs.slice(indexOfFirst, indexOfLast);

  const changePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=120&q=80';
  };

  return (
    <div className="p-4 md:p-6 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200/50 shadow-sm">
          <p className="text-slate-400 text-sm animate-pulse">Loading all blogs...</p>
        </div>
      ) : blogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/50 shadow-sm text-center p-6">
          <p className="text-slate-400 font-medium text-sm">No blogs found.</p>
          <Link to="/blogs/new" className="mt-4 px-4 py-2 bg-[#960c0c] text-white text-xs font-bold rounded-xl shadow-md shadow-red-950/10 hover:-translate-y-0.5 transition-all">
            Add Your First Blog
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/50 shadow-sm bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#960c0c] text-white">
              <tr>
                <th className="py-3 px-4 border border-[#850b0b] text-[10px] font-bold uppercase tracking-wider w-16 text-center">#</th>
                <th className="py-3 px-4 border border-[#850b0b] text-[10px] font-bold uppercase tracking-wider w-24 text-center">Image</th>
                <th className="py-3 px-4 border border-[#850b0b] text-[10px] font-bold uppercase tracking-wider">Title</th>
                <th className="py-3 px-4 border border-[#850b0b] text-[10px] font-bold uppercase tracking-wider w-32 text-center">Category</th>
                <th className="py-3 px-4 border border-[#850b0b] text-[10px] font-bold uppercase tracking-wider w-44">Author & Date</th>
                <th className="py-3 px-4 text-center border border-[#850b0b] text-[10px] font-bold uppercase tracking-wider w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBlogs.map((blog, index) => (
                <tr key={blog.id} className="hover:bg-slate-50/40 transition-colors duration-150 text-slate-650 font-medium">
                  <td className="py-3.5 px-4 border border-slate-100 text-slate-400 font-mono text-center">
                    {String((currentPage - 1) * blogsPerPage + index + 1).padStart(3, '0')}
                  </td>
                  <td className="py-3.5 px-4 border border-slate-100 text-center">
                    <div className="flex justify-center">
                      <img
                        src={`https://api.nemcare.com${blog.featured_image}`}
                        alt={blog.image_alt_text || blog.title}
                        onError={handleImageError}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-100 shadow-3xs bg-slate-50"
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border border-slate-100 font-bold text-slate-800 max-w-xs truncate hover:text-[#960c0c] transition-colors duration-150 cursor-pointer">
                    {blog.title}
                  </td>
                  <td className="py-3.5 px-4 border border-slate-100 text-center">
                    {getCategoryBadge(blog.category)}
                  </td>
                  <td className="py-3.5 px-4 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs">{capitalizeWords(blog.author_name)}</span>
                      <span className="text-slate-400 text-[10px] font-semibold mt-0.5">
                        {new Date(blog.published_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 border border-slate-100">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/blogs/${blog.id}`}
                        title="View Details"
                        className="text-blue-600 bg-blue-50/40 hover:bg-blue-100/60 p-2 rounded-xl border border-blue-100/20 transition-all shadow-3xs cursor-pointer inline-flex items-center justify-center"
                      >
                        <FiEye className="text-xs" />
                      </Link>
                      <Link
                        to={`/blogs/edit/${blog.id}`}
                        title="Edit Post"
                        className="text-amber-600 bg-amber-50/40 hover:bg-amber-100/60 p-2 rounded-xl border border-amber-100/20 transition-all shadow-3xs cursor-pointer inline-flex items-center justify-center"
                      >
                        <FiEdit3 className="text-xs" />
                      </Link>
                      <button
                        onClick={() => handleDelete(blog.id)}
                        title="Delete Post"
                        className="text-[#960c0c] bg-red-50/40 hover:bg-red-100/60 p-2 rounded-xl border border-red-100/20 transition-all shadow-3xs cursor-pointer inline-flex items-center justify-center"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/50 px-4 py-3 rounded-b-2xl">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200/50 rounded-xl shadow-3xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200"
            >
              Prev
            </button>
            
            <div className="flex items-center gap-1.5">
              {totalPages <= 1 ? (
                <button
                  disabled
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold rounded-xl bg-[#960c0c] text-white shadow-md shadow-red-950/15"
                >
                  1
                </button>
              ) : (
                [...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => changePage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-xl transition duration-200 ${currentPage === i + 1
                      ? 'bg-[#960c0c] text-white shadow-md shadow-red-950/15'
                      : 'bg-white border border-slate-200/50 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages <= 1}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200/50 rounded-xl shadow-3xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllBlogs;
