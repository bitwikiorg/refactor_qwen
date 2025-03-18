authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Username and password are required",
        });
    }

    // In production use proper authentication mechanism instead of accepting any username/password combination for demo purposes only!

    const userData = await User.findOne({ username });

    if (!userData || !(await userData.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token containing user data with secret key & options specified earlier!
    const token = jwt.sign(
      {
        _id: userData._id,
        username: userData.username,
        permissions: userData.permissions,
      },

      authConfig.jwtSecret,

      authConfig.jwtOptions,
    );

    logger.info(`User authenticated ${username}`);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
