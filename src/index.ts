import { extractText, getDocumentProxy } from "unpdf";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export interface Env {
  GEMINI_API_KEY: string;
  JACKS: KVNamespace;
}

enum Location {
  Benet = "BENET",
  AllSaints = "ALL_SAINTS"
}

interface LocationDetails {
  location: Location;
  menuUrl: string;
}

const LOCATION_DETAILS = new Map<Location, LocationDetails>();

LOCATION_DETAILS.set(Location.Benet, {
  location: Location.Benet,
  menuUrl: "https://docs.google.com/document/d/1dVYB7lnBgWE0bPhc9SFz0aLrkDfSCulrMctW1gDfCA8/export?format=pdf",
  name: "Bene't Street",
});

LOCATION_DETAILS.set(Location.AllSaints, {
  location: Location.AllSaints,
  menuUrl: "https://docs.google.com/document/d/1kDBSxPb8X4L2TKXWUmm2A-VGuPVTyxmfbq9iwUQQ2nc/export?format=pdf",
  name: "All Saints Passage",
});

const KV_CACHED_RESPONSE_KEY = "CACHED_RESPONSE-";
const KV_PDF_KEY = "PDF-";

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
  let reply = await result.response.text();

  let i = 0;
  let j = reply.length-1;
  for (; i<j && reply[i] !== '{'; ++i);
  for (; i<j && reply[j] !== '}'; --j);
  reply = reply.slice(i, j+1)
  const jsonReply = JSON.parse(reply);
  return jsonReply;
}


function getKeySuffix(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  return [year, month, day, hour].join("-");
}


async function doGet(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const now = new Date();
  const suffix = getKeySuffix(now);
  const responseKey = `${KV_CACHED_RESPONSE_KEY}-${suffix}`;

  const previously = await env.JACKS.get(responseKey);

  if (previously) {
    return new Response(previously);
  }

  const geminiApiKey = env.GEMINI_API_KEY;

  const locations = [];

  for (const location of [Location.Benet, Location.AllSaints]) {
    const details = LOCATION_DETAILS.get(location);
    const pdfKey = `${KV_PDF_KEY}-${location}-${suffix}`;
    const menuUrl = details.menuUrl;
    const r = await fetch(menuUrl);
    const buffer = await r.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const contents = textContent.items.map((item) => item.str).join("\n");
    const j = await convertMenuToJson(geminiApiKey, contents);
    await env.JACKS.put(pdfKey, buffer);
    j["currentMenuUrl"] = menuUrl;
    j["name"] = details.name;
    locations.push(j);
  }

  const retrievedAt = (new Date()).toISOString();
  const response = {
    locations,
    retrievedAt,
  };

  const textResponse = JSON.stringify(response, null, 2);
  await env.JACKS.put(responseKey, textResponse);

  return new Response(textResponse);
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

    return doGet(request, env, ctx);
  },
};
