import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getGoogleTokens, getGoogleUserInfo } from '../config/googleOAuth.js';

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// ১. গুগল লগইন শুরু (রাউট: GET /api/auth/google)
export const googleLogin = (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email`;
  res.redirect(url);
};
// ২. গুগল কলব্যাক (রাউট: GET /api/auth/google/callback)
// ডিবাগ ভার্সন - googleCallback
export const googleCallback = async (req, res) => {

  
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code missing' });
    }

    const tokens = await getGoogleTokens(code);
    if (!tokens || !tokens.access_token) {
      throw new Error('No access token received');
    }

    const googleUser = await getGoogleUserInfo(tokens.access_token);
    if (!googleUser || !googleUser.id) {
      throw new Error('No user data from Google');
    }

    let user = await User.findOne({ googleId: googleUser.id });
    if (!user) {
      user = new User({
        googleId: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        profilePicture: googleUser.picture || '',
        role: 'participant',
      });
      await user.save();
    } else {
      user.name = googleUser.name;
      user.profilePicture = googleUser.picture || user.profilePicture;
      await user.save();
    }

    const token = generateToken(user);
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
    res.redirect(redirectUrl);
    
  } catch (error) {

    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    res.status(500).json({ 
      message: 'Authentication failed', 
      error: error.message 
    });
  }
};

// ৩. নিজের প্রোফাইল আনা (রাউট: GET /api/auth/me)
export const getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ৪. প্রোফাইল আপডেট (PUT /api/auth/me)
export const updateProfile = async (req, res) => {
  try {
    const allowed = ['department', 'phone', 'bio', 'expertise', 'industry', 'designation'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-__v');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ৫. লগআউট (POST /api/auth/logout)
export const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};