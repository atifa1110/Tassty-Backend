import stream from "stream-chat";

const { verifyWebhook } = stream;

export const verifyStreamWebhook = (rawBody, signature) => {
  return verifyWebhook(
    rawBody,
    signature,
    process.env.STREAM_API_SECRET
  );
};
