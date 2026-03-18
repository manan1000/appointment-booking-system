import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { errorResponse, successResponse } from "../lib/response";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
    try {
        const parsedData = registerSchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "Invalid input")
        }

        const { name, email, password, role } = parsedData.data;
        const userAlreadyExists = await prisma.user.findUnique({
            where: { email }
        });

        if (userAlreadyExists) {
            return errorResponse(res, 409, "Email already exists");
        }

        const passwordHash = await Bun.password.hash(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role ?? "USER"
            }
        });

        const data = {
            message: `User created Successfully with id ${user.id}`
        };

        return successResponse(res, 201, data);

    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const parsedData = loginSchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "Invalid input")
        }

        const { email, password } = parsedData.data;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return errorResponse(res, 401, "Invalid credentials");
        }

        const isValidPassword = await Bun.password.verify(password, user.passwordHash);
        if (!isValidPassword) {
            return errorResponse(res, 401, "Invalid credentials");
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role
            },
            Bun.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        const data={
            token
        };

        return successResponse(res,200,data);
    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}