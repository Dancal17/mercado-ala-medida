
const CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Faltan credenciales de Cloudinary (CLOUD_NAME o UPLOAD_PRESET)");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'mercados-a-la-medida'); // Optional folder

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Error al subir imagen");
        }

        const data = await response.json();
        return data.secure_url; // Return the HTTPS URL
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};
