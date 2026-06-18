export type CloudConvertMediaJobPayloadInput = {
  assetId: string;
  exportCredentials: {
    accessKeyId: string;
    bucket: string;
    endpoint: string;
    secretAccessKey: string;
  };
  posterObjectKey: string;
  processedObjectKey: string;
  sourceObjectKey: string;
  webhookUrl?: string;
};

export function buildCloudConvertMediaJobPayload(input: CloudConvertMediaJobPayloadInput) {
  const s3TaskCredentials = {
    access_key_id: input.exportCredentials.accessKeyId,
    bucket: input.exportCredentials.bucket,
    endpoint: input.exportCredentials.endpoint,
    region: "auto",
    secret_access_key: input.exportCredentials.secretAccessKey,
  };

  return {
    tag: input.assetId,
    tasks: {
      "import-source": {
        ...s3TaskCredentials,
        key: input.sourceObjectKey,
        operation: "import/s3",
      },
      "convert-browser-mp4": {
        audio_bitrate: 512,
        audio_channels: 6,
        audio_codec: "aac",
        engine: "ffmpeg",
        input: "import-source",
        operation: "convert",
        output_format: "mp4",
        preset: "medium",
        video_codec: "x264",
      },
      "create-poster": {
        engine: "ffmpeg",
        input: "import-source",
        operation: "thumbnail",
        output_format: "jpg",
      },
      "export-browser-mp4": {
        ...s3TaskCredentials,
        input: "convert-browser-mp4",
        key: input.processedObjectKey,
        operation: "export/s3",
      },
      "export-poster": {
        ...s3TaskCredentials,
        input: "create-poster",
        key: input.posterObjectKey,
        operation: "export/s3",
      },
    },
    ...(input.webhookUrl ? { webhook_url: input.webhookUrl } : {}),
  };
}
