import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/Firebase';

const BlogDetails = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const docRef = doc(db, 'blogs', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBlog(docSnap.data());
        } else {
          console.log('No such document!');
        }
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
      <h2 className="text-lg pl-1 font-semibold mb-4 text-gray-800">Blog Details</h2>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Blog Content */}
        <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-6">
          <img
            src={blog.blogImage}
            alt={blog.title}
            className="w-full h-80 object-cover rounded-lg mb-4"
          />

          <div className="text-sm text-gray-600 mb-1">
            <strong>Author:</strong> {blog.author}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Published:</strong> {new Date(blog.createdAt).toLocaleDateString()}
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-4">{blog.title}</h1>

          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{blog.content}</p>

          <div className="mt-6 text-sm text-gray-500">
            <strong>Category:</strong> {blog.category}
          </div>
        </div>

        {/* Right Side: Tags */}
        <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Tags</h2>
          {blog.tags && typeof blog.tags === 'string' ? (
            <div className="flex flex-wrap gap-2">
              {blog.tags.split(',').map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-700 px-3 py-1 text-sm rounded-full"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No tags available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogDetails;
