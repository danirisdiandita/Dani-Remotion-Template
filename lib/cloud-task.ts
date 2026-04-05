import { GoogleAuth } from "google-auth-library";
import { ENV } from "@/config/constant";

let googleAuthInstance: GoogleAuth | null = null;

const getGoogleAuth = () => {
    if (!googleAuthInstance) {
        if (!ENV.gcp.clientEmail || !ENV.gcp.privateKey) {
            console.warn("Google Service Account credentials missing. Cloud Tasks will not work.");
            googleAuthInstance = new GoogleAuth();
        } else {
            googleAuthInstance = new GoogleAuth({
                scopes: "https://www.googleapis.com/auth/cloud-platform",
                credentials: {
                    client_email: ENV.gcp.clientEmail,
                    private_key: ENV.gcp.privateKey,
                },
            });
        }
    }
    return googleAuthInstance;
};

export const getAccessToken = async () => {
    const client = await getGoogleAuth().getClient();
    const token = await client.getAccessToken();
    return token.token;
};

export const createTaskAPI = async ({
    body,
    url = ENV.gcp.endpointUrl
}: {
    body: string,
    url?: string
}) => {
    if (!url) {
        throw new Error("GCP Endpoint URL is not defined in constants");
    }

    const token = await getAccessToken();
    
    const response = await fetch(
        `https://cloudtasks.googleapis.com/v2beta3/projects/${ENV.gcp.projectId}/locations/${ENV.gcp.location}/queues/${ENV.gcp.queueName}/tasks`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                task: {
                    httpRequest: {
                        httpMethod: "POST",
                        url: url,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: Buffer.from(body).toString('base64'),
                        oidcToken: {
                            serviceAccountEmail: ENV.gcp.clientEmail!,
                        },
                    }
                }
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error("Google Cloud Tasks API Error:", JSON.stringify(result, null, 2));
        throw new Error(result.error?.message || `Cloud Tasks API failed with status ${response.status}`);
    }

    return result;
}
