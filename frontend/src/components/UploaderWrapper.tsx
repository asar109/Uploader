import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

interface UploadableFile {
  file: File;
  id: string;
  url: string;
  progress: number;
  est: string;
  status: "pending" | "uploading" | "success" | "error";
  remoteUrl?: string;
}

const UploaderWrapper = () => {
  const [selectedFiles, setSelectedFiles] = useState<UploadableFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      url: URL.createObjectURL(file),
      progress: 0,
      status: "pending" as const,
      est : ""
    }));
    // Scale: Allow adding more files instead of replacing
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading, // Disable dropzone during upload
  });

  // Cleanup Blob URLs
  useEffect(() => {
    return () => selectedFiles.forEach((file) => URL.revokeObjectURL(file.url));
  }, [selectedFiles]);

  const uploadSingleFile = async (fileWrapper: UploadableFile) => {
    const formData = new FormData();
    formData.append("file", fileWrapper.file);
    formData.append("upload_preset", "random named");

    const startTime = Date.now();

    return axios.post(
      "https://api.cloudinary.com/v1_1/dxkn26bp8/auto/upload",
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const percentage = Math.floor((loaded * 100) / total);
          
          const elapsedTime = (Date.now() - startTime) / 1000;
          const bps = loaded / elapsedTime;
          const secondsRemaining = (total - loaded) / bps;
          const est = secondsRemaining > 0 ? `${Math.ceil(secondsRemaining)}s remaining` : "Finishing...";

          setSelectedFiles((prev) =>
            prev.map((item) =>
              item.id === fileWrapper.id
                ? {
                    ...item,
                    progress: percentage,
                    est: est,
                    status: "uploading" as const,
                  }
                : item,
            ),
          );
        },
      },
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    try {
      // Scale: Handle all files in parallel
      const uploadPromises = selectedFiles.map(async (fileWrapper) => {
        try {
          const response = await uploadSingleFile(fileWrapper);
          setSelectedFiles((prev) =>
            prev.map((item) =>
              item.id === fileWrapper.id
                ? {
                    ...item,
                    status: "success" as const,
                    progress: 100,
                    remoteUrl: response.data.secure_url,
                  }
                : item,
            ),
          );
        } catch (error) {
          setSelectedFiles((prev) =>
            prev.map((item) =>
              item.id === fileWrapper.id
                ? { ...item, status: "error" as const, progress: 0 }
                : item,
            ),
          );
          throw error;
        }
      });

      await Promise.all(uploadPromises);

      console.log("All uploads complete");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("One or more uploads failed.");
    } finally {
      setUploading(false);
    }
  };

  const resetUploader = () => {
    setSelectedFiles([]);
    setUploading(false);
  };

  const removeFile = (id: string) => {
    if (uploading) return;
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-8 max-w-4xl mx-auto min-h-[400px] flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-3xl text-orange-600 font-bold">Uploader</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload anything up to 10MB per file
        </p>
      </div>

      {/* Persistent Dropzone Area (Prevents Layout Shift) */}
      {selectedFiles.length < 1 && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 text-center cursor-pointer 
          ${isDragActive ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-400"}`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">
            Drag 'n' drop files here, or click to select
          </p>
        </div>
      )}

      {/* Preview Section - Appears below without hiding the dropzone */}
      <div className="mt-8 flex-grow">
        {selectedFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto max-h-[300px] p-2">
            {selectedFiles.map((fileWrapper) => (
              <div
                key={fileWrapper.id}
                className="relative group border rounded-lg p-2 bg-gray-50"
              >
                <img
                  src={fileWrapper.url}
                  className="h-24 w-full object-cover rounded-md"
                  alt="preview"
                />

                {!uploading && (
                  <button
                    onClick={() => removeFile(fileWrapper.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                )}

                {/* Progress Bar */}
                {fileWrapper.status === "uploading" && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${fileWrapper.progress}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-gray-500 text-center mt-1">{fileWrapper.est}</div>
                  </div>
                )}
                {fileWrapper.status === "success" && (
                  <div className="mt-1 flex flex-col items-center">
                    <div className="text-green-600 text-[10px] font-bold">
                      Success!
                    </div>
                    <a
                      href={fileWrapper.remoteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 text-[10px] underline truncate w-full text-center"
                    >
                      View Live
                    </a>
                  </div>
                )}
                {fileWrapper.status === "error" && (
                  <div className="text-red-600 text-xs font-bold text-center mt-1">
                    Error
                  </div>
                )}

                <div className="text-[10px] truncate mt-1 text-center font-medium">
                  {(fileWrapper.file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Controls */}
      <div className="mt-6 flex flex-col items-center border-t pt-6">
        {uploading ? (
          <div className="text-orange-600 font-semibold animate-pulse">
            Uploading files...
          </div>
        ) : (
          selectedFiles.length > 0 && (
            <div className="flex gap-4">
              {selectedFiles.some(
                (f) => f.status === "pending" || f.status === "error",
              ) && (
                <button
                  onClick={handleUpload}
                  className="px-10 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 shadow-lg active:transform active:scale-95 transition-all"
                >
                  Upload {selectedFiles.length}{" "}
                  {selectedFiles.length === 1 ? "File" : "Files"}
                </button>
              )}
              <button
                onClick={resetUploader}
                className="px-10 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Clear & Start Over
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default UploaderWrapper;
