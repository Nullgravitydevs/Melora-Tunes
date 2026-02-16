
import { loadScript } from "./utils";

// Types for Google API
declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export interface BackupData {
    mixes: any[];
    likedSongs: any[];
    history: any[];
    settings: any;
    timestamp: number;
    deviceId: string;
}

export const GoogleDriveService = {

    // 1. Initialize API and Identity Services
    init: async () => {
        if (gapiInited && gisInited) return true;

        try {
            await loadScript('https://apis.google.com/js/api.js');
            await new Promise<void>((resolve, reject) => {
                window.gapi.load('client', { callback: resolve, onerror: reject });
            });
            await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;

            await loadScript('https://accounts.google.com/gsi/client');
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined at request time
            });
            gisInited = true;
            return true;
        } catch (e) {
            console.error("GDrive Init Failed", e);
            return false;
        }
    },

    // 2. Sign In context (Request Access Token)
    signIn: async (): Promise<boolean> => {
        if (!tokenClient) await GoogleDriveService.init();

        return new Promise((resolve, reject) => {
            tokenClient.callback = async (resp: any) => {
                if (resp.error) reject(resp);
                resolve(true);
            };

            // Request permission
            if (window.gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    },

    // 3. Find Backup File
    findBackupFile: async (): Promise<string | null> => {
        try {
            const response = await window.gapi.client.drive.files.list({
                q: "name = 'melora_backup.json' and 'appDataFolder' in parents and trashed = false",
                fields: 'files(id, name)',
                spaces: 'appDataFolder'
            });
            const files = response.result.files;
            if (files && files.length > 0) return files[0].id;
            return null;
        } catch (e) {
            console.error("Error finding backup", e);
            return null;
        }
    },

    // 4. Upload (Create or Update)
    uploadBackup: async (data: BackupData): Promise<boolean> => {
        try {
            // Check if we have a token
            if (!window.gapi.client.getToken()) await GoogleDriveService.signIn();

            const fileId = await GoogleDriveService.findBackupFile();
            const fileContent = JSON.stringify(data);

            const metadata = {
                name: 'melora_backup.json',
                mimeType: 'application/json',
                parents: fileId ? [] : ['appDataFolder']
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([fileContent], { type: 'application/json' }));

            const accessToken = window.gapi.client.getToken().access_token;

            let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            let method = 'POST';

            if (fileId) {
                url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
                method = 'PATCH';
            }

            await fetch(url, {
                method: method,
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form
            });

            return true;
        } catch (e) {
            console.error("Upload failed", e);
            return false;
        }
    },

    // 5. Download
    downloadBackup: async (): Promise<BackupData | null> => {
        try {
            if (!window.gapi.client.getToken()) await GoogleDriveService.signIn();

            const fileId = await GoogleDriveService.findBackupFile();
            if (!fileId) return null;

            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            return response.result as BackupData;
        } catch (e) {
            console.error("Download failed", e);
            return null;
        }
    },

    // 6. Sign Out
    signOut: () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken('');
        }
    }
};
