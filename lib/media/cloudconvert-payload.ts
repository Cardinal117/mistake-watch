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
  const sourceFilename = readObjectFilename(input.sourceObjectKey);
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
        arguments:
          `-hide_banner -y -i "/input/import-source/${sourceFilename}" -map 0:v:0 -map 0:a:0? -dn -sn -vf "scale=w='min(1920,iw)':h=-2" -c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -crf 21 -c:a aac -b:a 320k -ac 2 -movflags +faststart /output/output.mp4`,
        capture_output: true,
        command: "ffmpeg",
        engine: "ffmpeg",
        input: "import-source",
        operation: "command",
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

function readObjectFilename(objectKey: string) {
  return objectKey.split("/").filter(Boolean).at(-1) ?? "input";
}
