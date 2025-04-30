// packages/vite/src/api/axios.ts
import { OpenAPIClientAxios } from "openapi-client-axios";
import spec from "@sparta/utils/openapi/api-docs.json";
const apiInstance = new OpenAPIClientAxios({
    definition: spec,
    // validate: false, // Invalid option, removed
    axiosConfigDefaults: {
        baseURL: process.env.VITE_APP_API_URL,
        timeout: 10_000,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    },
});
// Initialize and export the promise directly
export const clientPromise = apiInstance
    .init()
    .then((client) => {
    return client;
})
    .catch((err) => {
    console.error("axios.ts: Client init() failed:", err);
    throw err;
});
//# sourceMappingURL=axios.js.map