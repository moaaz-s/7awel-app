import React from "react";
import { ErrorCircleIcon } from "@/components/icons";

export const ErrorIcon = () => {
  return (
    <div className="flex items-center justify-center mb-2">
      <div className="rounded-full bg-red-500 p-4 w-14 h-14 flex items-center justify-center">
        <ErrorCircleIcon className="h-7 w-7 text-white" />
      </div>
    </div>
  );
};
