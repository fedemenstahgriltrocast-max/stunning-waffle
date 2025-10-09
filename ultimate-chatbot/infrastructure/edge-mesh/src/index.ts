import { jsonResponse } from "./../workers/shared/protocol";

export default {
  async fetch(): Promise<Response> {
    return jsonResponse({ message: "Ultimate chatbot root worker placeholder" });
  },
};
