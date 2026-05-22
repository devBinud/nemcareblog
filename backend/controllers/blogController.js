const { pool } = require('../config/db');
const { cloudinary } = require('../middleware/upload');

// GET all blogs
const getAllBlogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM blogs ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch blogs', error: err.message });
  }
};

// GET single blog by ID
const getBlogById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Blog not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch blog', error: err.message });
  }
};

// POST create blog
const createBlog = async (req, res) => {
  try {
    const { title, content, category, tags, author, designation } = req.body;

    const blogImage = req.files?.blogImage?.[0]?.path || null;
    const authorImage = req.files?.authorImage?.[0]?.path || null;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO blogs (title, content, category, tags, author, designation, author_image, blog_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, content, category, tags, author, designation, authorImage, blogImage]
    );

    const [newBlog] = await pool.query('SELECT * FROM blogs WHERE id = ?', [result.insertId]);
    res.status(201).json(newBlog[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create blog', error: err.message });
  }
};

// PUT update blog
const updateBlog = async (req, res) => {
  try {
    const { title, content, category, tags, author, designation } = req.body;
    const { id } = req.params;

    // Check blog exists
    const [existing] = await pool.query('SELECT * FROM blogs WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Blog not found' });

    const blog = existing[0];

    // Use new images if uploaded, otherwise keep existing
    const blogImage = req.files?.blogImage?.[0]?.path || blog.blog_image;
    const authorImage = req.files?.authorImage?.[0]?.path || blog.author_image;

    await pool.query(
      `UPDATE blogs SET title=?, content=?, category=?, tags=?, author=?, designation=?, author_image=?, blog_image=?
       WHERE id=?`,
      [title, content, category, tags, author, designation, authorImage, blogImage, id]
    );

    const [updated] = await pool.query('SELECT * FROM blogs WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update blog', error: err.message });
  }
};

// DELETE blog
const deleteBlog = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Blog not found' });

    // Delete images from Cloudinary if they exist
    const blog = rows[0];
    const extractPublicId = (url) => {
      if (!url) return null;
      const parts = url.split('/');
      const file = parts[parts.length - 1].split('.')[0];
      const folder = parts[parts.length - 2];
      return `${folder}/${file}`;
    };

    if (blog.blog_image) await cloudinary.uploader.destroy(extractPublicId(blog.blog_image));
    if (blog.author_image) await cloudinary.uploader.destroy(extractPublicId(blog.author_image));

    await pool.query('DELETE FROM blogs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete blog', error: err.message });
  }
};

module.exports = { getAllBlogs, getBlogById, createBlog, updateBlog, deleteBlog };
