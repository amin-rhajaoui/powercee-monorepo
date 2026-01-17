/**
 * Upload API Service
 * File upload to S3 via backend proxy
 */

import { apiClient } from '../api';

// ============================================================================
// Types
// ============================================================================

export interface UploadResponse {
    url: string;
    filename: string;
    content_type: string;
    size: number;
}

export interface UploadOptions {
    onProgress?: (progress: number) => void;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Upload a file to S3 via the backend proxy
 * @param file - The file to upload (from expo-document-picker or expo-image-picker)
 * @param options - Optional upload options
 * @returns The uploaded file URL and metadata
 */
export async function uploadFile(
    file: {
        uri: string;
        name: string;
        type: string;
    },
    options?: UploadOptions
): Promise<UploadResponse> {
    const formData = new FormData();

    // React Native FormData format
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
    } as unknown as Blob);

    const response = await apiClient.post<UploadResponse>('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: options?.onProgress
            ? (progressEvent) => {
                if (progressEvent.total) {
                    const progress = (progressEvent.loaded / progressEvent.total) * 100;
                    options.onProgress!(progress);
                }
            }
            : undefined,
    });

    return response.data;
}

/**
 * Upload an image from expo-image-picker
 */
export async function uploadImage(
    imageResult: {
        uri: string;
        fileName?: string | null;
        mimeType?: string;
    },
    options?: UploadOptions
): Promise<UploadResponse> {
    const filename = imageResult.fileName || `photo_${Date.now()}.jpg`;
    const mimeType = imageResult.mimeType || 'image/jpeg';

    return uploadFile(
        {
            uri: imageResult.uri,
            name: filename,
            type: mimeType,
        },
        options
    );
}

/**
 * Upload a document from expo-document-picker
 */
export async function uploadDocument(
    documentResult: {
        uri: string;
        name: string;
        mimeType?: string;
    },
    options?: UploadOptions
): Promise<UploadResponse> {
    return uploadFile(
        {
            uri: documentResult.uri,
            name: documentResult.name,
            type: documentResult.mimeType || 'application/pdf',
        },
        options
    );
}
