import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../../../models/User.js'; // Adjust the path as needed
import authConfig from '../../../config/authConfig.js'; // Adjust the path as needed
import logger from '../../../utils/logger.js'; // Adjust the path as needed

const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Username and password are required',
        });
    }

    const userData = await User.findOne({ username });

    if (!userData || !(await userData.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        _id: userData._id,
        username: userData.username,
        permissions: userData.permissions,
      },
      authConfig.jwtSecret,
      authConfig.jwtOptions
    );

    logger.info(`User authenticated ${username}`);

    res.json({
      success: true,
      token,
      user: {
        _id: userData._id,
        username: userData.username,
        permissions: userData.permissions,
      },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default authRouter;
