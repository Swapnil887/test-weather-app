import { Response } from "express";

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}

export function sendErrorResponse(res: Response, error: unknown) {
  //console.error(error);
  return res.status(500).json({ message: getErrorMessage(error) });
}
