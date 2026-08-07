const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Registration successful }
 *       409: { description: Email already exists }
 */
const register = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Un compte avec cet email existe déjà"
            });
        }

        const user = await User.create({ fullName, email, password });

        return res.status(201).json({
            success: true,
            message: "Inscription réussie ! Vous pouvez maintenant vous connecter.",
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                bio: user.bio,
                phone: user.phone
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "L'inscription a échoué",
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and receive JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        const isPasswordValid = await user.validPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            success: true,
            message: "Connexion réussie !",
            token: token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                bio: user.bio,
                phone: user.phone
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "La connexion a échoué",
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               bio: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, email, bio, phone } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Un compte avec cet email existe déjà"
                });
            }
            user.email = email;
        }

        if (fullName !== undefined) user.fullName = fullName;
        if (bio !== undefined) user.bio = bio;
        if (phone !== undefined) user.phone = phone;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profil mis à jour avec succès !",
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                bio: user.bio,
                phone: user.phone
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "La mise à jour du profil a échoué",
            error: error.message
        });
    }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User profile }
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'fullName', 'email', 'bio', 'phone']
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { register, login, updateProfile, getMe };
