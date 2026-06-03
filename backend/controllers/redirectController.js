import Url from '../models/Url.js';
import Analytics from '../models/Analytics.js';
import { parseUserAgent, getRandomCountry } from '../utils/helpers.js';

/**
 * @desc    Redirect to original URL & log analytics
 * @route   GET /r/:shortCode
 * @access  Public
 */
export const redirectUrl = async (req, res) => {
  const { shortCode } = req.params;

  try {
    // Look up short code or custom alias (case insensitive lookup)
    const url = await Url.findOne({
      $or: [
        { shortCode: new RegExp(`^${shortCode}$`, 'i') },
        { customAlias: new RegExp(`^${shortCode}$`, 'i') }
      ]
    });

    if (!url) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found | Shorty</title>
          <style>
            body {
              background: #0a0f1d;
              color: #f3f4f6;
              font-family: 'Outfit', -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 20px;
              padding: 40px;
              max-width: 450px;
              box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            }
            h1 {
              color: #ef4444;
              font-size: 2.5rem;
              margin-top: 0;
            }
            p {
              color: #9ca3af;
              font-size: 1.1rem;
              line-height: 1.6;
            }
            .btn {
              display: inline-block;
              margin-top: 20px;
              background: linear-gradient(135deg, #6366f1, #4f46e5);
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 10px;
              font-weight: 600;
              transition: all 0.2s;
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(99,102,241,0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404</h1>
            <h2>Oops! Link Not Found</h2>
            <p>The shortened URL link you are trying to access does not exist or has been deleted by its owner.</p>
            <a href="http://localhost:5173" class="btn">Go to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    // Check expiration
    if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Expired | Shorty</title>
          <style>
            body {
              background: #0a0f1d;
              color: #f3f4f6;
              font-family: 'Outfit', -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 20px;
              padding: 40px;
              max-width: 450px;
              box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            }
            h1 {
              color: #f59e0b;
              font-size: 2.5rem;
              margin-top: 0;
            }
            p {
              color: #9ca3af;
              font-size: 1.1rem;
              line-height: 1.6;
            }
            .btn {
              display: inline-block;
              margin-top: 20px;
              background: linear-gradient(135deg, #6366f1, #4f46e5);
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 10px;
              font-weight: 600;
              transition: all 0.2s;
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(99,102,241,0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Link Expired</h1>
            <h2>Access Period Ended</h2>
            <p>This shortened link had an expiration date set by its creator and is no longer active.</p>
            <a href="http://localhost:5173" class="btn">Go to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    // Capture visitor analytics
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os, device } = parseUserAgent(userAgent);
    const country = getRandomCountry(); // Simulated rich location tracker

    // Save analytics record asynchronously
    await Analytics.create({
      urlId: url._id,
      ipAddress: ip,
      userAgent,
      browser,
      os,
      device,
      country,
    });

    // Server-side redirect
    return res.redirect(302, url.originalUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
