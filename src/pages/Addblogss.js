import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e, setter) => {
    if (e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData, blogImage, authorImage);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8">
        
        {/* Blog Title */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">Blog Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter blog title"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#960c0c]"
            required
          />
        </div>

        {/* Blog Image */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">Blog Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, setBlogImage)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-[#960c0c] file:text-white hover:file:bg-[#7d0a0a]"
            required
          />
        </div>

        {/* Blog Content */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">Content</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows="8"
            placeholder="Write your blog content here..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#960c0c]"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g., Heart, Diabetes, Awareness"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#960c0c]"
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">Tags (comma separated)</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="e.g., cardiology, tips, health"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#960c0c]"
          />
        </div>

        {/* Author Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium text-gray-700 mb-2">Author Name</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Dr. John Doe"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#960c0c]"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-2">Author Designation</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Cardiologist, Nemcare Hospital"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#960c0c]"
              required
            />
          </div>
        </div>

        {/* Author Image */}
        <div>
          <label className="block font-medium text-gray-700 mb-2">Author Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e, setAuthorImage)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-[#960c0c] file:text-white hover:file:bg-[#7d0a0a]"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="text-right">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#960c0c] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#7d0a0a] transition"
          >
            <FaPlus /> Publish Blog
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBlogs;
