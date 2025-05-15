import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/Firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const EditBlogs = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    designation: '',
    tags: '',
    category: '',
  });

  const [blogImage, setBlogImage] = useState(null);
  const [authorImage, setAuthorImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBlog = async () => {
      const docRef = doc(db, 'blogs', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          title: data.title || '',
          content: data.content || '',
          author: data.author || '',
          designation: data.designation || '',
          tags: data.tags || '',
          category: data.category || '',
        });
        setBlogImage(data.blogImage || null);
        setAuthorImage(data.authorImage || null);
      }
    };

    fetchBlog();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e, setter) => {
    if (e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedData = {
        ...formData,
        blogImage: typeof blogImage === 'string' ? blogImage : URL.createObjectURL(blogImage),
        authorImage: typeof authorImage === 'string' ? authorImage : URL.createObjectURL(authorImage),
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'blogs', id);
      await updateDoc(docRef, updatedData);

      alert('Blog updated successfully!');
      navigate('/blogs');
    } catch (err) {
      console.error('Error updating blog:', err);
      alert('Failed to update blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-5">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Edit Blog</h2>
      <div className="max-w-6xl mx-auto w-full bg-white p-6 rounded-xl shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Blog Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter blog title"
              className="w-full px-4 py-2 text-base rounded-md border border-gray-300 bg-gray-100 outline-none focus:ring-2 focus:ring-[#960c0c]"
              required
            />
          </div>

          {/* Blog Image */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Blog Image</label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="blogImage"
                className="cursor-pointer bg-[#960c0c] hover:bg-[#7d0a0a] text-white py-2 px-4 rounded shadow text-sm"
              >
                Choose Blog Image
              </label>
              <span className="text-sm text-gray-600">
                {blogImage ? (typeof blogImage === 'string' ? 'Current image' : blogImage.name) : 'No file chosen'}
              </span>
            </div>
            <input
              id="blogImage"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, setBlogImage)}
              className="hidden"
            />
            {blogImage && (
              <img
                src={typeof blogImage === 'string' ? blogImage : URL.createObjectURL(blogImage)}
                alt="Blog"
                className="mt-4 w-48 h-32 object-cover rounded-lg shadow"
              />
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Content</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="8"
              placeholder="Write blog content..."
              className="w-full px-4 py-2 text-base rounded-md border border-gray-300 bg-gray-100 outline-none focus:ring-2 focus:ring-[#960c0c]"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Heart, Diabetes, Awareness"
              className="w-full px-4 py-2 text-base rounded-md border border-gray-300 bg-gray-100 outline-none focus:ring-2 focus:ring-[#960c0c]"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., health, tips, awareness"
              className="w-full px-4 py-2 text-base rounded-md border border-gray-300 bg-gray-100 outline-none focus:ring-2 focus:ring-[#960c0c]"
            />
          </div>

          {/* Author Info */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Author Image */}
            <div className="flex flex-col p-4 border border-gray-300 rounded-lg shadow bg-white">
              <label className="block text-base font-medium text-gray-700 mb-1">Author Image</label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="authorImage"
                  className="cursor-pointer bg-[#960c0c] hover:bg-[#7d0a0a] text-white py-2 px-4 rounded shadow text-sm"
                >
                  Choose Author Image
                </label>
                <span className="text-sm text-gray-600">
                  {authorImage ? (typeof authorImage === 'string' ? 'Current image' : authorImage.name) : 'No file chosen'}
                </span>
              </div>
              <input
                id="authorImage"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, setAuthorImage)}
                className="hidden"
              />
              {authorImage && (
                <img
                  src={typeof authorImage === 'string' ? authorImage : URL.createObjectURL(authorImage)}
                  alt="Author"
                  className="mt-4 w-32 h-32 object-cover rounded-full shadow"
                />
              )}
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Author Name</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                placeholder="Dr. John Doe"
                className="w-full px-4 py-2 text-base rounded-md border border-gray-300 bg-gray-100 outline-none focus:ring-2 focus:ring-[#960c0c]"
                required
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Cardiologist"
                className="w-full px-4 py-2 text-base rounded-md border border-gray-300 bg-gray-100 outline-none focus:ring-2 focus:ring-[#960c0c]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-right">
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#960c0c] hover:bg-[#7d0a0a] text-white py-3 text-base rounded-md font-semibold transition-all duration-300 active:scale-95 shadow"
            >
              {loading ? 'Updating...' : 'Update Blog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBlogs;
