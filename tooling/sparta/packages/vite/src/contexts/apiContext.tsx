import { createContext } from "react";
import type { Client as ApiClient } from "../api/generated";

export const ApiContext = createContext<ApiClient | null>(null);
