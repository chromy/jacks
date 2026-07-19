import { extractText, getDocumentProxy } from "unpdf";
import { GoogleGenAI } from "@google/genai";

export interface Env {
  GEMINI_API_KEY: string;
  JACKS: KVNamespace;
}

interface Flavour {
  name: string;
  isVegan: boolean;
}

enum Location {
  Benet = "BENET",
  AllSaints = "ALL_SAINTS"
}

interface LocationDetails {
  location: Location;
  menuUrl: string;
  name: string;
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

const VERSION = 1;
const KV_CACHED_RESPONSE_KEY = `CACHED_RESPONSE-${VERSION}-`;
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

The text is:
`;

const MENU_JSON_SCHEMA = {
  type: "object",
  properties: {
    flavours: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          isVegan: { type: "boolean" },
        },
        required: ["name", "isVegan"],
        propertyOrdering: ["name", "isVegan"],
      },
    },
  },
  required: ["flavours"],
  propertyOrdering: ["flavours"],
};

const PREFERENCE_PROMPT = `
Hi!
Below is a JSON list of ice cream flavours currently available, followed by
a free-text description of a customer's taste preferences.
Please return the names of only the flavours from the available list that
this customer would likely enjoy, based on their stated preferences. Do not
invent flavour names that aren't in the available list.

Available flavours:
`;

const PREFERENCE_JSON_SCHEMA = {
  type: "object",
  properties: {
    flavourNames: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["flavourNames"],
  propertyOrdering: ["flavourNames"],
};

interface Profile {
  name: string;
  preferences: string;
}

// TODO: fill in real preference descriptions for each profile.
const PROFILES: Profile[] = [
  { name: "Hector", preferences: "I love cookie, chocolate, coffee, raspberry, ripples, nuts, fudge, and brownie. For sorbets I like passionfruit, elderflower, and similar." },
  { name: "Iridium", preferences: "I like caramel/toffee/fudge/sugar flavours, flavours with biscuit/cake/marzipan inclusions and nut/sesame flavours. I also like fruit/sorbet flavours that are very fresh like yuzu/apricot/pear/elderflower. I don't like banana, coffee, mint, rhubarb, cheescake, coconut, basil, or those containing alcohols." },
];

function predictedLikedKey(profileName: string): string {
  return `${profileName.charAt(0).toLowerCase()}${profileName.slice(1)}PredictedLiked`;
}

async function filterFlavoursByPreference(
  geminiApiKey: string,
  currentFlavours: Flavour[],
  preferences: string
): Promise<Flavour[]> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const contents =
    PREFERENCE_PROMPT +
    JSON.stringify(currentFlavours, null, 2) +
    "\n\nCustomer preferences:\n" +
    preferences;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents,
    config: {
      temperature: GENERATION_CONFIG.temperature,
      topP: GENERATION_CONFIG.topP,
      topK: GENERATION_CONFIG.topK,
      maxOutputTokens: GENERATION_CONFIG.maxOutputTokens,
      responseMimeType: GENERATION_CONFIG.responseMimeType,
      responseJsonSchema: PREFERENCE_JSON_SCHEMA,
    },
  });

  const reply = response.text;
  if (!reply) {
    throw new Error("Gemini returned an empty response");
  }

  const { flavourNames } = JSON.parse(reply) as { flavourNames: string[] };

  const wanted = new Set(flavourNames);
  return currentFlavours.filter((f) => wanted.has(f.name));
}

async function convertMenuToJson(geminiApiKey: string, menu: string) {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: PROMPT + menu,
    config: {
      temperature: GENERATION_CONFIG.temperature,
      topP: GENERATION_CONFIG.topP,
      topK: GENERATION_CONFIG.topK,
      maxOutputTokens: GENERATION_CONFIG.maxOutputTokens,
      responseMimeType: GENERATION_CONFIG.responseMimeType,
      responseJsonSchema: MENU_JSON_SCHEMA,
    },
  });

  const reply = response.text;
  if (!reply) {
    throw new Error("Gemini returned an empty response");
  }

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
    if (!details) {
      throw new Error(`No location details found for ${location}`);
    }
    const pdfKey = `${KV_PDF_KEY}-${location}-${suffix}`;
    const menuUrl = details.menuUrl;
    const r = await fetch(menuUrl);
    const buffer = await r.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const contents = textContent.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join("\n");
    const j = await convertMenuToJson(geminiApiKey, contents);
    await env.JACKS.put(pdfKey, buffer);
    j["currentMenuUrl"] = menuUrl;
    j["name"] = details.name;

    for (const profile of PROFILES) {
      const liked = await filterFlavoursByPreference(geminiApiKey, j.flavours, profile.preferences);
      const likedNames = new Set(liked.map((f: Flavour) => f.name));
      const key = predictedLikedKey(profile.name);
      for (const flavour of j.flavours) {
        flavour[key] = likedNames.has(flavour.name);
      }
    }

    locations.push(j);
  }

  const retrievedAt = (new Date()).toISOString();
  const response = {
    locations,
    retrievedAt,
    version: VERSION,
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
