import type { Request, Response } from "express";

import { errorResponse, successResponse } from "../lib/response";
import { prisma } from "../lib/prisma";
import { createAvailabilitySchema, createServiceSchema } from "../schemas/service.schema";
import { userRole } from "../../generated/prisma/enums";
import { timeToMinutes } from "../lib/timeToMinutes";

export const createService = async (req: Request, res: Response) => {
    try {
        if (req.role !== userRole.SERVICE_PROVIDER) {
            return errorResponse(res, 403, "Forbidden");
        }
        const parsedData = createServiceSchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "Invalid input")
        }

        const { name, type, durationMinutes } = parsedData.data;

        const service = await prisma.service.create({
            data: {
                name,
                type,
                providerId: req.userId,
                durationMinutes
            }
        });

        const data = {
            id: service.id,
            name: service.name,
            type: service.type,
            durationMinutes: service.durationMinutes
        }
        return successResponse(res, 201, data);

    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}

export const createAvailability = async (req: Request, res: Response) => {
    try {
        if (req.role !== userRole.SERVICE_PROVIDER) {
            return errorResponse(res, 403, "Forbidden");
        }
        const parsedData = createAvailabilitySchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "Invalid input")
        }

        const { dayOfWeek, startTime, endTime } = parsedData.data;
        const serviceId = req.params.serviceId as string;
        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if(!service){
            return errorResponse(res,404,"service not found");
        }

        if(service.providerId!==req.userId){
            return errorResponse(res,403,"service soes not belong to the provider");
        }
        
        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        if (newStart >= newEnd) {
            return errorResponse(res, 400, "Invalid time range");
        }
        
        // check overlapping availability
        
        const existingAvailavbilities = await prisma.availability.findMany({
            where: {
                serviceId,
                dayOfWeek
            }
        });
        
        
        if(existingAvailavbilities){

            for(const slot of existingAvailavbilities){
                const existingStartTime = timeToMinutes(slot.startTime);
                const existingEndTime = timeToMinutes(slot.endTime);

                const isOverlapping = newStart < existingEndTime && newEnd > existingStartTime;
                if(isOverlapping){
                    return errorResponse(res,409,"overlapping availability");
                }
            }

        }

        const availability = await prisma.availability.create({
            data:{
                serviceId,
                dayOfWeek,
                startTime,
                endTime
            }
        });

        const data = {
            dayOfWeek: availability.dayOfWeek,
            startTime: availability.startTime,
            endTime: availability.endTime
        };

        return successResponse(res,201,data);
    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}