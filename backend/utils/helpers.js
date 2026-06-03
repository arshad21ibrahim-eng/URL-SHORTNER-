import crypto from 'crypto';

/**
 * Validates whether a given string is a valid URL.
 */
export const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

/**
 * Generates a unique short code of specified length.
 */
export const generateShortCode = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

/**
 * Parses User-Agent header to extract browser, OS, and device type.
 */
export const parseUserAgent = (uaString) => {
  if (!uaString) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  }

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Device detection
  if (/mobi|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(uaString)) {
    if (/ipad/i.test(uaString)) {
      device = 'Tablet';
    } else {
      device = 'Mobile';
    }
  } else {
    device = 'Desktop';
  }

  // OS detection
  if (/windows/i.test(uaString)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(uaString)) {
    os = 'macOS';
  } else if (/iphone|ipad|ipod/i.test(uaString)) {
    os = 'iOS';
  } else if (/android/i.test(uaString)) {
    os = 'Android';
  } else if (/linux/i.test(uaString)) {
    os = 'Linux';
  }

  // Browser detection
  if (/edg/i.test(uaString)) {
    browser = 'Edge';
  } else if (/chrome|crios/i.test(uaString) && !/opr|opios|edg/i.test(uaString)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/i.test(uaString)) {
    browser = 'Firefox';
  } else if (/safari/i.test(uaString) && !/chrome|crios|opr|opios|edg/i.test(uaString)) {
    browser = 'Safari';
  } else if (/opr|opera/i.test(uaString)) {
    browser = 'Opera';
  }

  return { browser, os, device };
};

/**
 * Returns a realistic country name for beautiful analytics visuals.
 */
export const getRandomCountry = () => {
  const countries = [
    'United States', 'India', 'Germany', 'United Kingdom', 
    'Canada', 'Australia', 'Japan', 'France', 'Brazil', 'Singapore'
  ];
  // Select a weighted country for variety
  const index = Math.floor(Math.random() * countries.length);
  return countries[index];
};

