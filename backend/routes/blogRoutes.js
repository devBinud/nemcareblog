const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');

// Upload fields: blogImage and authorImage
const uploadFields = upload.fields([
  { name: 'blogImage', maxCount: 1 },
  { name: 'authorImage', maxCount: 1 },
]);

router.get('/', getAllBlogs);
router.get('/:id', getBlogById);
router.post('/', uploadFields, createBlog);
router.put('/:id', uploadFields, updateBlog);
router.delete('/:id', deleteBlog);

module.exports = router;
