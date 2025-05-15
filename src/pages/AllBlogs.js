import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/Firebase';
import { FaTrash, FaEdit, FaEye } from 'react-icons/fa';
import { Link } from 'react-router-dom';

// Utils
const formatDate = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

const getCategoryBadgeColor = (category) => {
  switch (category?.toLowerCase()) {
    case 'health':
      return 'bg-green-100 text-green-700';
    case 'cardiology':
      return 'bg-blue-100 text-blue-700';
    case 'surgery':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const AllBlogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log(blogs)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 5;

  const fetchBlogs = async () => {
    const querySnapshot = await getDocs(collection(db, 'blogs'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBlogs(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm('Are you sure you want to delete this blog?');
    if (!confirm) return;
    await deleteDoc(doc(db, 'blogs', id));
    setBlogs(prev => prev.filter(blog => blog.id !== id));
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(blogs.length / blogsPerPage);
  const indexOfLast = currentPage * blogsPerPage;
  const indexOfFirst = indexOfLast - blogsPerPage;
  const currentBlogs = blogs.slice(indexOfFirst, indexOfLast);

  const changePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-5">
      <h2 className="text-lg pl-1 font-semibold mb-6 text-gray-800">All Blogs</h2>

      {loading ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : blogs.length === 0 ? (
        <div className="text-center text-gray-500">No blogs found.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
          <table className="min-w-full table-auto text-sm text-gray-800 border-collapse">
            <thead className="bg-[#960c0c] text-white">
              <tr>
                <th className="p-4 border border-gray-300">#</th>
                <th className="p-4 border border-gray-300">Image</th>
                <th className="p-4 border border-gray-300">Title</th>
                <th className="p-4 border border-gray-300">Category</th>
                <th className="p-4 border border-gray-300">Author & Date</th>
                <th className="p-4 border border-gray-300 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentBlogs.map((blog, index) => (
                <tr
                  key={blog.id}
                  className="hover:bg-gray-100 transition border-t border-gray-200"
                >
                  <td className="p-4 border border-gray-200">
                    {(currentPage - 1) * blogsPerPage + index + 1}
                  </td>
                  <td className="p-4 border border-gray-200">
                    <img
                      src={blog.blogImage}
                      alt="Blog"
                      className="w-14 h-14 object-cover rounded-md border shadow-sm"
                    />
                  </td>
                  <td className="p-4 border border-gray-200 font-semibold max-w-xs truncate">
                    {blog.title}
                  </td>
                  <td className="p-4 border border-gray-200">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryBadgeColor(
                        blog.category || 'others'
                      )}`}
                    >
                      {blog.category || 'Others'}
                    </span>
                  </td>
                  <td className="p-4 border border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4 text-sm text-gray-700">
                      <span className="font-medium">{blog.author}</span>
                      <span className="text-gray-500 text-xs md:text-sm">
                        {formatDate(blog.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 border border-gray-200 flex justify-center gap-4">
                    <Link
                      to={`/blogs/${blog.id}`}
                      title="View"
                      className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-md shadow-sm transition"
                    >
                      <FaEye />
                    </Link>
                    <Link
                      to={`/blogs/edit/${blog.id}`}
                      title="Edit"
                      className="text-yellow-700 bg-yellow-50 hover:bg-yellow-100 p-2 rounded-md shadow-sm transition"
                    >
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => handleDelete(blog.id)}
                      title="Delete"
                      className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-md shadow-sm transition"
                    >
                      <FaTrash />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center p-4 border-t bg-gray-50">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>
            <div className="space-x-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => changePage(i + 1)}
                  className={`px-3 py-1 rounded shadow-sm ${currentPage === i + 1
                      ? 'bg-[#960c0c] text-white'
                      : 'bg-white border hover:bg-gray-100'
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 disabled:opacity-50"
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
