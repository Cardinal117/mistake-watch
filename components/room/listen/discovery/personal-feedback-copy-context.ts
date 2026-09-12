"use client";
import { createContext } from "react";
import { defaultPersonalFeedbackCopy } from "@/lib/recommendations/personal-feedback-copy";
export const PersonalFeedbackCopyContext = createContext(
  defaultPersonalFeedbackCopy,
);
