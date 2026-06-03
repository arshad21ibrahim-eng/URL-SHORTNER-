import express from 'express';
import {
  createShortUrl,
  getUserUrls,
  getUrlDetails,
  updateUrl,
  deleteUrl,
  bulkShortenUrls,
} from '../controllers/urlController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createShortUrl)
  .get(protect, getUserUrls);

router.post('/bulk', protect, bulkShortenUrls);

router.route('/:id')
  .get(protect, getUrlDetails)
  .put(protect, updateUrl)
  .delete(protect, deleteUrl);

export default router;
