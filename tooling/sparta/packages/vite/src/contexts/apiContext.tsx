import { createContext } from "react";
import type { Client as ApiClient } from "@sparta/utils/openapi/types";

export const ApiContext = createContext<ApiClient | null>(null);
