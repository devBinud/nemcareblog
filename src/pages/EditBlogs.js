import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/Firebase';

const EditBlogs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const docRef = doc(db, 'blogs', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBlog(data);
          setTitle(data.title || '');
          setContent(data.content || '');
          setCategory(data.category || '');
          setTags(data.tags || '');
        } else {
          console.log('No such blog!');
        }
      } catch (error) {
        console.error('Error fetching blog:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'blogs', id), {
        title,
        content,
        category,
        tags,
      });
      alert('Blog updated successfully');
      navigate('/blogs');
    } catch (error) {
      console.error('Error updating blog:', error);
      alert('Failed to update blog');
    }
  };

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (!blog) return <div className="text-center p-10">Blog not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-5">
      <h2 className="text-lg pl-7 font-semibold mb-6 text-gray-800">Edit Blog</h2>

      <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Title Field */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Blog Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter blog title"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            />
          </div>

          {/* Content Field */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Content <span className="text-red-600">*</span>
            </label>
            <textarea
              rows="6"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog content here..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            ></textarea>
          </div>

          {/* Category Field */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Category <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Enter blog category"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            />
          </div>

          {/* Tags Field */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Tags <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Add tags, separated by commas"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            />
          </div>

          {/* Update Button */}
          <div>
            <button
              type="submit"
              className="w-full py-3 mt-4 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition duration-300"
            >
              Update Blog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBlogs;
