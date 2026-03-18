import type { NextFunction, Request, Response } from "express";
import { errorResponse } from "../lib/response";
import jwt from "jsonwebtoken";
import type { userRole } from "../../generated/prisma/enums";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return errorResponse(res, 401, "UNAUTHORIZED");
        }
        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            return errorResponse(res, 401, "UNAUTHORIZED");
        }

        const decodedValue = jwt.verify(token, Bun.env.JWT_SECRET as string) as {
            userId: string,
            role: userRole
        };

        req.userId = decodedValue.userId;
        req.role = decodedValue.role;
        next();
        
    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
};