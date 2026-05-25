const generateTokens = require('../utils/generateToken')
const logger = require('../utils/logger')
const { validateRegistration } = require('../utils/validation')
const User = require('../models/User')

// user registration

const registerUser = async (req, res) => {

    logger.info('Registration endpoint hit...')

    try {

        // validate request body

        const { error } = validateRegistration(req.body)

        if (error) {

            logger.warn('Validation error', error.details[0].message)

            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { email, password, username } = req.body

        // check existing user

        let user = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (user) {

            logger.warn('user already exist')

            return res.status(400).json({
                success: false,
                message: "user already exist"
            })
        }

        // create new user

        user = new User({
            username,
            email,
            password
        })

        await user.save()

        logger.info('User saved successfully', user._id)

        // generate tokens

        const { accessToken, refreshToken } = await generateTokens(user)

        return res.status(201).json({
            success: true,
            message: "user registered successfully!!",
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })

    } catch (e) {

        logger.error('Registration error occured', e)

        return res.status(500).json({
            success: false,
            message: e.message
        })
    }
}

module.exports = { registerUser }