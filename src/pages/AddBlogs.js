import React, { useState, useRef } from 'react';
import { FaPlus } from 'react-icons/fa';
import { db } from '../firebase/Firebase'; // Adjust if path differs
import { collection, addDoc } from 'firebase/firestore';

const AddBlogs = () => {
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

  const blogImageRef = useRef(null);
  const authorImageRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e, setter) => {
    if (e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', 'unsigned_blog'); // Your unsigned preset
    data.append('cloud_name', 'dixjgj1p8'); // Replace with your Cloudinary cloud name

    const res = await fetch('https://api.cloudinary.com/v1_1/dixjgj1p8/image/upload', {
      method: 'POST',
      body: data,
    });

    const result = await res.json();
    return result.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const blogImageUrl = await uploadToCloudinary(blogImage);
      const authorImageUrl = await uploadToCloudinary(authorImage);

      const blogData = {
        ...formData,
        blogImage: blogImageUrl,
        authorImage: authorImageUrl,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'blogs'), blogData);
      alert('Blog submitted successfully!');

      // Reset form fields
      setFormData({
        title: '',
        content: '',
        author: '',
        designation: '',
        tags: '',
        category: '',
      });
      setBlogImage(null);
      setAuthorImage(null);
      blogImageRef.current.value = '';
      authorImageRef.current.value = '';
    } catch (err) {
      console.error('Upload or Firestore Error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-5">
      <h2 className="text-lg pl-1 font-semibold mb-6 text-gray-800">Add New Blog</h2>
      <div className="max-w-6xl mx-auto w-full bg-white p-5 rounded-xl shadow-xl transition-all duration-300">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8">
          {/* Blog Title */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Blog Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter blog title"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            />
          </div>

          {/* Blog Image */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Blog Image <span className="text-red-600">*</span>
            </label>
            <input
              ref={blogImageRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, setBlogImage)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-[#960c0c] file:text-white hover:file:bg-[#7d0a0a]"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Content <span className="text-red-600">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="8"
              placeholder="Write your blog content here..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Category <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Heart, Diabetes, Awareness"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
              Tags (comma separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., cardiology, tips, health"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
            />
          </div>

          {/* Author Name, Designation, and Image */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Author Image */}
            <div className="flex flex-col justify-center p-4 border border-gray-300 rounded-lg shadow-md bg-white">
              <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
                Author Image <span className="text-red-600">*</span>
              </label>
              <input
                ref={authorImageRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, setAuthorImage)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-[#960c0c] file:text-white hover:file:bg-[#7d0a0a]"
                required
              />
              {authorImage && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(authorImage)}
                    alt="Author"
                    className="w-32 h-32 object-cover rounded-full shadow-lg"
                  />
                </div>
              )}
            </div>
            {/* Author Name */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
                Author Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                placeholder="Dr. John Doe"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
                required
              />
            </div>

            {/* Author Designation */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2 tracking-wide">
                Author Designation
              </label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Cardiologist"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-right">
            <button
              type="submit"
              className="w-full mt-6 flex items-center justify-center gap-2 bg-[#960c0c] text-white py-3 px-4 rounded-md font-medium text-sm transition-all duration-300 hover:bg-[#7c0a0a] active:scale-95 shadow-sm"
              disabled={loading}
            >
              <FaPlus />
              {loading ? 'Publishing...' : 'Publish Blog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBlogs;
