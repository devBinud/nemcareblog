import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = 'https://api.nemcare.com/api/blogs';

const BlogDetails = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await fetch(`${API_URL}/${id}`);
        const json = await res.json();
        setBlog(json.data || json);
      } catch (error) {
        console.error('Error fetching blog:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [id]);

  if (loading) return <div className="text-center mt-10 text-gray-600">Loading...</div>;
  if (!blog) return <div className="text-center mt-10 text-red-500">Blog not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left: Blog Content */}
        <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-6">
          <img
            src={`https://api.nemcare.com${blog.featured_image}`}
            alt={blog.image_alt_text || blog.title}
            className="w-full h-80 object-cover rounded-lg mb-4"
          />

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <span><strong>Author:</strong> {blog.author_name}</span>
            <span><strong>Designation:</strong> {blog.author_designation}</span>
            <span><strong>Department:</strong> {blog.department}</span>
            <span><strong>Published:</strong> {new Date(blog.published_date).toLocaleDateString()}</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">{blog.title}</h1>

          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{blog.content}</p>

          <div className="mt-6 text-sm text-gray-500">
            <strong>Category:</strong> {blog.category}
          </div>
        </div>

        {/* Right: Meta & Tags */}
        <div className="w-full md:w-1/3 space-y-4">
          {/* Focus Keyword */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">SEO Info</h2>
            <p className="text-sm text-gray-600 mb-1"><strong>Meta Title:</strong> {blog.meta_title}</p>
            <p className="text-sm text-gray-600 mb-1"><strong>Meta Description:</strong> {blog.meta_description}</p>
            <p className="text-sm text-gray-600"><strong>Focus Keyword:</strong> {blog.focus_keyword}</p>
          </div>

          {/* Tags / Category */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Category</h2>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 text-sm rounded-full">
              {blog.category}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BlogDetails;
