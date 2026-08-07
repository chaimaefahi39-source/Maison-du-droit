
const validateRegister = (req, res, next) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Tous les champs sont obligatoires (fullName, email, password)"
        });
    }

    if (fullName.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: "Le nom doit contenir au moins 2 caractères"
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Format d'email invalide"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Le mot de passe doit contenir au moins 6 caractères"
        });
    }

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "L'email et le mot de passe sont obligatoires"
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Format d'email invalide"
        });
    }

    next();
};

module.exports = {
    validateRegister,
    validateLogin
};
