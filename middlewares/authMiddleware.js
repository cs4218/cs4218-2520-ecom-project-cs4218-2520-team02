import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
export const requireSignIn = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decode = JWT.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = decode;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send({
            success: false,
            error,
            message: "Invalid token",
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).send({
                success: false,
                message: "Not signed in",
            });
        }

        const user = await userModel.findById(req.user._id);
        if (!user) {
            return res.status(401).send({
                success: false,
                message: "User not found",
            });
        }

        if (user.role !== 1) {
            return res.status(403).send({
                success: false,
                message: "Admin access required",
            });
        } 
        
        next();
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            error,
            message: "Error in admin middleware",
        });
    }
};