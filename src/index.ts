import { extractText, getDocumentProxy } from "unpdf";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export interface Env {
  GEMINI_API_KEY: string;
  JACKS: KVNamespace;
}

const KV_CACHED_RESPONSE_KEY = "CACHED_RESPONSE_KEY";
const MENU_URL = "https://docs.google.com/document/d/1kDBSxPb8X4L2TKXWUmm2A-VGuPVTyxmfbq9iwUQQ2nc/export?format=pdf";

const TIMEOUT_MS = 60 * 60 * 1000;

const GENERATION_CONFIG = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const PROMPT = `
Hi!
The text below is from an ice cream menu.
Please report the available ice cream flavours as json.
The json should match the following format:
{
  flavours: [
    {
      "name": "Vanilla",
      "isVegan": false,
    },
    {
      "name": "Alphonso Mango Sorbet",
      "isVegan": true,
    }
  ]
}

The text is:
`;

async function convertMenuToJson(geminiApiKey: string, menu: string) {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const chatSession = model.startChat({
    GENERATION_CONFIG,
    history: []
  });

  const result = await chatSession.sendMessage(PROMPT + menu);
  const reply = await result.response.text();
  const j = JSON.parse(reply);
  return j;
}


export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.url.endsWith("favicon.ico")) {
      return new Response("", {
        status: 404,
      });
    }

    const previously = await env.JACKS.get(KV_CACHED_RESPONSE_KEY);

    if (previously) {
      try {
        const lastResponse = JSON.parse(previously);
        const retrievedAt = new Date(lastResponse.retrievedAt);
        const limit = new Date(+retrievedAt + TIMEOUT_MS);
        const now = new Date();
        console.log(now, limit, retrievedAt, now < limit);
        if (now < limit) {
          console.log("cached");
          return new Response(previously);
        }
      } catch(e) {
        await env.JACKS.put(KV_CACHED_RESPONSE_KEY, null);
        throw new Error(`Unexpected error '${e}' decoding previous '${previous}'`)
      }
    }

    const geminiApiKey = env.GEMINI_API_KEY;
    const r = await fetch(MENU_URL);
    const buffer = await r.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const contents = textContent.items.map((item) => item.str).join("\n");
    const j = await convertMenuToJson(geminiApiKey, contents);
    j["menuUrl"] = MENU_URL;
    j["retrievedAt"] = (new Date()).toISOString();

    const response = JSON.stringify(j, null, 2);
    await env.JACKS.put(KV_CACHED_RESPONSE_KEY, response);

    return new Response(response);
  },
};
