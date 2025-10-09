export default {
  async fetch(): Promise<Response> {
    return new Response(
      JSON.stringify({ message: "Ultimate chatbot root worker placeholder" }, null, 2),
      { headers: { "content-type": "application/json" } },
    );
  },
};
