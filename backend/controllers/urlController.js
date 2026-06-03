import mongoose from 'mongoose';
import Url from '../models/Url.js';
import Analytics from '../models/Analytics.js';
import { isValidUrl, generateShortCode } from '../utils/helpers.js';

/**
 * @desc    Create a shortened URL
 * @route   POST /api/urls
 * @access  Private
 */
export const createShortUrl = async (req, res) => {
  const { originalUrl, customAlias, description, expiresAt } = req.body;

  try {
    if (!originalUrl) {
      return res.status(400).json({ message: 'Original URL is required' });
    }

    // Validate originalUrl is proper URL
    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ message: 'Invalid URL format. Include http:// or https://' });
    }

    // Handle Custom Alias
    let shortCode = '';
    if (customAlias) {
      const trimmedAlias = customAlias.trim().toLowerCase();
      
      // Validation: custom alias cannot contain slashes or weird chars
      if (!/^[a-z0-9-_]+$/i.test(trimmedAlias)) {
        return res.status(400).json({ message: 'Custom alias can only contain alphanumeric characters, hyphens, and underscores' });
      }

      // Check if alias is already taken
      const existingAlias = await Url.findOne({
        $or: [{ shortCode: trimmedAlias }, { customAlias: trimmedAlias }]
      });
      if (existingAlias) {
        return res.status(400).json({ message: 'Custom alias or short code is already in use' });
      }
      shortCode = trimmedAlias;
    } else {
      // Generate a unique short code with collision check
      let attempts = 0;
      while (attempts < 5) {
        const candidateCode = generateShortCode(6);
        const codeExists = await Url.findOne({
          $or: [{ shortCode: candidateCode }, { customAlias: candidateCode }]
        });
        if (!codeExists) {
          shortCode = candidateCode;
          break;
        }
        attempts++;
      }
      if (!shortCode) {
        return res.status(500).json({ message: 'Failed to generate a unique short code. Please try again.' });
      }
    }

    // Create Url
    const url = await Url.create({
      userId: req.user.id,
      originalUrl,
      shortCode,
      customAlias: customAlias ? customAlias.trim().toLowerCase() : undefined,
      description: description || '',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json(url);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all shortened URLs for the authenticated user
 * @route   GET /api/urls
 * @access  Private
 */
export const getUserUrls = async (req, res) => {
  try {
    // Aggregation query: gets all URLs and joins with count of their associated Analytics
    const urls = await Url.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $lookup: {
          from: 'analytics',
          localField: '_id',
          foreignField: 'urlId',
          as: 'clicks',
        },
      },
      {
        $project: {
          originalUrl: 1,
          shortCode: 1,
          customAlias: 1,
          description: 1,
          expiresAt: 1,
          createdAt: 1,
          totalClicks: { $size: '$clicks' },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(urls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get detailed metadata and deep analytics of a single URL
 * @route   GET /api/urls/:id
 * @access  Private
 */
export const getUrlDetails = async (req, res) => {
  try {
    const url = await Url.findOne({ _id: req.params.id, userId: req.user.id });

    if (!url) {
      return res.status(404).json({ message: 'URL not found or unauthorized' });
    }

    // Get all analytics for this url
    const analyticsList = await Analytics.find({ urlId: url._id }).sort({ timestamp: -1 });

    const totalClicks = analyticsList.length;
    const lastVisited = totalClicks > 0 ? analyticsList[0].timestamp : null;

    // Aggregate statistics
    const deviceStats = {};
    const browserStats = {};
    const osStats = {};

    analyticsList.forEach((visit) => {
      deviceStats[visit.device] = (deviceStats[visit.device] || 0) + 1;
      browserStats[visit.browser] = (browserStats[visit.browser] || 0) + 1;
      osStats[visit.os] = (osStats[visit.os] || 0) + 1;
    });

    // Format stats as arrays for charts
    const formatStats = (statsObj) =>
      Object.keys(statsObj).map((key) => ({
        name: key,
        value: statsObj[key],
      }));

    res.json({
      url,
      totalClicks,
      lastVisited,
      deviceStats: formatStats(deviceStats),
      browserStats: formatStats(browserStats),
      osStats: formatStats(osStats),
      recentVisits: analyticsList.slice(0, 100), // Get last 100 visits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update an existing shortened URL configuration
 * @route   PUT /api/urls/:id
 * @access  Private
 */
export const updateUrl = async (req, res) => {
  const { originalUrl, customAlias, description, expiresAt } = req.body;

  try {
    const url = await Url.findOne({ _id: req.params.id, userId: req.user.id });

    if (!url) {
      return res.status(404).json({ message: 'URL not found or unauthorized' });
    }

    // If destination is updating
    if (originalUrl) {
      if (!isValidUrl(originalUrl)) {
        return res.status(400).json({ message: 'Invalid URL format. Include http:// or https://' });
      }
      url.originalUrl = originalUrl;
    }

    // If custom alias is changing
    if (customAlias !== undefined) {
      if (customAlias === '') {
        url.customAlias = undefined;
      } else {
        const trimmedAlias = customAlias.trim().toLowerCase();
        
        if (!/^[a-z0-9-_]+$/i.test(trimmedAlias)) {
          return res.status(400).json({ message: 'Custom alias can only contain alphanumeric characters, hyphens, and underscores' });
        }

        if (trimmedAlias !== url.customAlias) {
          // Check collision
          const collision = await Url.findOne({
            _id: { $ne: url._id },
            $or: [{ shortCode: trimmedAlias }, { customAlias: trimmedAlias }]
          });
          if (collision) {
            return res.status(400).json({ message: 'Custom alias or short code is already taken' });
          }
          url.customAlias = trimmedAlias;
        }
      }
    }

    if (description !== undefined) {
      url.description = description;
    }

    if (expiresAt !== undefined) {
      url.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updatedUrl = await url.save();
    res.json(updatedUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a shortened URL and all of its click logs (cascade)
 * @route   DELETE /api/urls/:id
 * @access  Private
 */
export const deleteUrl = async (req, res) => {
  try {
    const url = await Url.findOne({ _id: req.params.id, userId: req.user.id });

    if (!url) {
      return res.status(404).json({ message: 'URL not found or unauthorized' });
    }

    // Delete associated analytics first
    await Analytics.deleteMany({ urlId: url._id });

    // Delete the URL itself
    await Url.deleteOne({ _id: url._id });

    res.json({ message: 'URL and associated analytics deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Bulk URL Shortening via CSV Import (text based)
 * @route   POST /api/urls/bulk
 * @access  Private
 */
export const bulkShortenUrls = async (req, res) => {
  const { csvText } = req.body;

  try {
    if (!csvText) {
      return res.status(400).json({ message: 'CSV content is required' });
    }

    // Split text by lines
    const lines = csvText.split(/\r?\n/);
    const results = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Parse comma separated: originalUrl, customAlias (optional), description (optional)
      // Basic CSV parser (ignoring nested commas for simple implementation, or can support quotes)
      const parts = line.split(',');
      const originalUrl = parts[0]?.trim();
      const customAlias = parts[1]?.trim() || undefined;
      const description = parts[2]?.trim() || '';

      if (!originalUrl) {
        errors.push({ line: i + 1, error: 'Original URL is missing' });
        continue;
      }

      if (!isValidUrl(originalUrl)) {
        errors.push({ line: i + 1, originalUrl, error: 'Invalid URL format' });
        continue;
      }

      let shortCode = '';
      if (customAlias) {
        const trimmedAlias = customAlias.trim().toLowerCase();
        if (!/^[a-z0-9-_]+$/i.test(trimmedAlias)) {
          errors.push({ line: i + 1, originalUrl, error: 'Invalid custom alias format' });
          continue;
        }

        const existing = await Url.findOne({
          $or: [{ shortCode: trimmedAlias }, { customAlias: trimmedAlias }]
        });
        if (existing) {
          errors.push({ line: i + 1, originalUrl, error: `Alias '${trimmedAlias}' is already in use` });
          continue;
        }
        shortCode = trimmedAlias;
      } else {
        let attempts = 0;
        while (attempts < 5) {
          const candidateCode = generateShortCode(6);
          const codeExists = await Url.findOne({
            $or: [{ shortCode: candidateCode }, { customAlias: candidateCode }]
          });
          if (!codeExists) {
            shortCode = candidateCode;
            break;
          }
          attempts++;
        }
      }

      if (!shortCode) {
        errors.push({ line: i + 1, originalUrl, error: 'Failed to generate unique code' });
        continue;
      }

      try {
        const url = await Url.create({
          userId: req.user.id,
          originalUrl,
          shortCode,
          customAlias: customAlias ? customAlias.trim().toLowerCase() : undefined,
          description,
        });
        results.push(url);
      } catch (err) {
        errors.push({ line: i + 1, originalUrl, error: err.message });
      }
    }

    res.status(201).json({
      successCount: results.length,
      errorCount: errors.length,
      urls: results,
      errors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
