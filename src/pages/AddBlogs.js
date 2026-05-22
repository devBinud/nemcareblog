import React, { useState, useRef } from 'react';
import { FaPlus, FaSpinner } from 'react-icons/fa';
import { apiFormFetch } from '../utils/api';
import { ToastContainer } from '../components/Toast';
import useToast from '../hooks/useToast';

const AddBlogs = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    author_name: '',
    author_designation: '',
    department: '',
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    image_alt_text: '',
    published_date: '',
  });

  const [featuredImage, setFeaturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const imageRef = useRef(null);
  const { toasts, removeToast, success, error } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, value));
      if (featuredImage) data.append('featured_image', featuredImage);

      const res = await apiFormFetch('/blogs', { method: 'POST', body: data });
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || 'Failed to create blog');

      success('Blog published successfully!');
      setFormData({
        title: '', content: '', category: '', author_name: '',
        author_designation: '', department: '', meta_title: '',
        meta_description: '', focus_keyword: '', image_alt_text: '', published_date: '',
      });
      setFeaturedImage(null);
      imageRef.current.value = '';
    } catch (err) {
      console.error('Error:', err);
      error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#960c0c] bg-gray-100";
  const labelClass = "block font-semibold text-gray-700 mb-2 tracking-wide";

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-5">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h2 className="text-lg pl-1 font-semibold mb-6 text-gray-800">Add New Blog</h2>
      <div className="max-w-6xl mx-auto w-full bg-white p-5 rounded-xl shadow-xl">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">

          {/* Title */}
          <div>
            <label className={labelClass}>Blog Title <span className="text-red-600">*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleChange}
              placeholder="Enter blog title" className={inputClass} required />
          </div>

          {/* Featured Image */}
          <div>
            <label className={labelClass}>Featured Image <span className="text-red-600">*</span></label>
            <input ref={imageRef} type="file" accept="image/*"
              onChange={(e) => setFeaturedImage(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-[#960c0c] file:text-white hover:file:bg-[#7d0a0a]"
              required />
            {featuredImage && (
              <img src={URL.createObjectURL(featuredImage)} alt="Preview"
                className="mt-3 w-full max-w-sm h-48 object-cover rounded-md shadow" />
            )}
          </div>

          {/* Image Alt Text */}
          <div>
            <label className={labelClass}>Image Alt Text</label>
            <input type="text" name="image_alt_text" value={formData.image_alt_text} onChange={handleChange}
              placeholder="Describe the image for SEO" className={inputClass} />
          </div>

          {/* Content */}
          <div>
            <label className={labelClass}>Content <span className="text-red-600">*</span></label>
            <textarea name="content" value={formData.content} onChange={handleChange}
              rows="8" placeholder="Write your blog content here..."
              className={inputClass} required />
          </div>

          {/* Category & Published Date */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Category <span className="text-red-600">*</span></label>
              <input type="text" name="category" value={formData.category} onChange={handleChange}
                placeholder="e.g., health, cardiology" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Published Date <span className="text-red-600">*</span></label>
              <input type="date" name="published_date" value={formData.published_date} onChange={handleChange}
                className={inputClass} required />
            </div>
          </div>

          {/* Author Info */}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Author Name <span className="text-red-600">*</span></label>
              <input type="text" name="author_name" value={formData.author_name} onChange={handleChange}
                placeholder="Dr. John Doe" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Author Designation</label>
              <input type="text" name="author_designation" value={formData.author_designation} onChange={handleChange}
                placeholder="Cardiologist" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange}
                placeholder="Cardiology" className={inputClass} />
            </div>
          </div>

          {/* SEO Fields */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-bold text-gray-600 uppercase mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Meta Title</label>
                <input type="text" name="meta_title" value={formData.meta_title} onChange={handleChange}
                  placeholder="SEO meta title" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Meta Description</label>
                <textarea name="meta_description" value={formData.meta_description} onChange={handleChange}
                  rows="3" placeholder="SEO meta description" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Focus Keyword</label>
                <input type="text" name="focus_keyword" value={formData.focus_keyword} onChange={handleChange}
                  placeholder="e.g., diabetes treatment" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[#960c0c] text-white py-3 px-4 rounded-md font-medium text-sm transition-all duration-300 hover:bg-[#7c0a0a] active:scale-95 shadow-sm disabled:opacity-60">
            {loading ? <><FaSpinner className="animate-spin" /> Publishing...</> : <><FaPlus /> Publish Blog</>}
          </button>

        </form>
      </div>
    </div>
  );
};

export default AddBlogs;
