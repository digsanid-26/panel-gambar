# aKlaude API Docs
aKlaude is an Anthropic API proxy — same Anthropic Messages API shape, same models, 10× cheaper than first-party pricing. Two API shapes are supported side-by-side: OpenAI Chat Completions and Anthropic Messages. Drop in by changing one base URL.

## Quickstart
Create an API key at dashboard/keys. Point your favourite SDK at https://api.aklaude.xyz/api/proxy as the base URL. Make a request.

### cURL
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [{"role":"user","content":"Write a haiku about debugging."}]
  }'
```

### Python (Anthropic SDK)
```bash
import anthropic

client = anthropic.Anthropic(
    api_key="cr-sk-…",
    base_url="https://api.aklaude.xyz/api/proxy",
)

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a haiku about debugging."}],
)
print(message.content[0].text)
```

### Python (OpenAI SDK)
```bash
from openai import OpenAI

client = OpenAI(
    api_key="cr-sk-…",
    base_url="https://api.aklaude.xyz/api/proxy/v1",
)

response = client.chat.completions.create(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Write a haiku about debugging."}],
)
print(response.choices[0].message.content)
```
### Node (OpenAI SDK)
```bash
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "cr-sk-…",
  baseURL: "https://api.aklaude.xyz/api/proxy/v1",
});

const response = await client.chat.completions.create({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "Write a haiku about debugging." }],
});
console.log(response.choices[0].message.content);
```

## Authentication
Every endpoint accepts the API key on either header — pick whichever your SDK already sends:

Authorization: Bearer cr-sk-… — used by OpenAI SDKs, Cursor, Continue, Cline, Roo Code, and any tool pointed at /v1.
x-api-key: cr-sk-… — used by Anthropic SDKs and Claude Code CLI when pointed at /v1/messages.
Keys are account-scoped. Revoke from dashboard/keys — subsequent calls fail with 401 immediately, no propagation delay.


## Tool Integrations
Drop-in configs for the most popular tools.

Open the API Keys page from the sidebar, click Create key, give it a memorable name, and copy the secret.
Heads up. Treat your key like a password.

### Claude Code CLI
Claude Code speaks the Anthropic Messages API. Two env vars:

```bash
export ANTHROPIC_BASE_URL="https://api.aklaude.xyz/api/proxy"
export ANTHROPIC_API_KEY="cr-sk-…"

claude
```
### Cursor
Custom API keys in Cursor require a Pro plan. Free accounts cannot override the base URL.
Settings → Models → OpenAI API Key:
API Key: cr-sk-…
Override OpenAI Base URL: https://api.aklaude.xyz/api/proxy/v1
Add custom model: claude-fable-5, claude-sonnet-4-6, claude-opus-4-8, etc.

### Continue.dev
Continue uses YAML (~/.continue/config.yaml). Use provider: openai for every model.
```bash
name: aKlaude
version: 0.0.1
schema: v1
models:
  - name: Claude Fable 5
    provider: openai
    model: claude-fable-5
    apiBase: https://api.aklaude.xyz/api/proxy/v1
    apiKey: cr-sk-…
    roles:
      - chat
      - edit
      - apply
  - name: Claude Sonnet 4.6
    provider: openai
    model: claude-sonnet-4-6
    apiBase: https://api.aklaude.xyz/api/proxy/v1
    apiKey: cr-sk-…
    roles:
      - chat
      - edit
      - apply
  - name: Claude Opus 4.8
    provider: openai
    model: claude-opus-4-8
    apiBase: https://api.aklaude.xyz/api/proxy/v1
    apiKey: cr-sk-…
    roles:
      - chat
      - edit
```


### OpenCode
Use OpenCode as a terminal AI coding assistant routed through aKlaude.
#### Install
```bash
curl -fsSL https://opencode.ai/install | bash
```
#### ~/.config/opencode/opencode.json
```bash
{
  "$schema": "https://opencode.ai/config.json",
  "model": "aklaude/claude-sonnet-4-6",
  "provider": {
    "aklaude": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "aKlaude",
      "options": {
        "baseURL": "https://api.aklaude.xyz/api/proxy/v1",
        "apiKey": "cr-sk-…"
      },
      "models": {
        "claude-opus-4-8":   { "name": "Claude Opus 4.8", "tool_call": true },
        "claude-fable-5":    { "name": "Claude Fable 5", "tool_call": true },
        "claude-opus-4-7":   { "name": "Claude Opus 4.7", "tool_call": true },
        "claude-sonnet-4-6": { "name": "Claude Sonnet 4.6", "tool_call": true },
        "claude-haiku-4-5":  { "name": "Claude Haiku 4.5", "tool_call": true }
      }
    }
  }
}
```
Launch with opencode. Switch models with /model inside the session.

### OpenAI Codex CLI
Use OpenAI Codex CLI as a terminal coding agent routed through aKlaude.

Create ~/.codex/config.toml:
#### ~/.codex/config.toml
```bash
model = "claude-sonnet-4-6"
model_provider = "aklaude"
model_reasoning_effort = "high"

[model_providers.aklaude]
name = "aklaude"
base_url = "https://api.aklaude.xyz/api/proxy/v1"
experimental_bearer_token = "cr-sk-…"
wire_api = "responses"
requires_openai_auth = true

[model_properties."claude-fable-5"]
context_window = 200000
max_context_window = 200000
supports_parallel_tool_calls = true
supports_reasoning_summaries = false
input_modalities = ["text", "image"]

[model_properties."claude-sonnet-4-6"]
context_window = 200000
max_context_window = 200000
supports_parallel_tool_calls = true
supports_reasoning_summaries = false
input_modalities = ["text", "image"]

[model_properties."claude-opus-4-8"]
context_window = 200000
max_context_window = 200000
supports_parallel_tool_calls = true
supports_reasoning_summaries = false
input_modalities = ["text", "image"]

[model_properties."claude-haiku-4-5"]
context_window = 200000
max_context_window = 200000
supports_parallel_tool_calls = true
supports_reasoning_summaries = false
input_modalities = ["text", "image"]
```
## API Reference
### GET /v1/models
OpenAI-shaped catalog discovery. Returns all available models.

```bash
curl https://api.aklaude.xyz/api/proxy/v1/models \
  -H "Authorization: Bearer cr-sk-…"
```
#### json
```bash
{
  "object": "list",
  "data": [
    { "id": "claude-fable-5", "object": "model", "owned_by": "aklaude" },
    { "id": "claude-opus-4-8", "object": "model", "owned_by": "aklaude" },
    { "id": "claude-opus-4-7", "object": "model", "owned_by": "aklaude" },
    { "id": "claude-sonnet-4-6", "object": "model", "owned_by": "aklaude" },
    { "id": "claude-haiku-4-5", "object": "model", "owned_by": "aklaude" }
  ]
}
```
### POST /v1/chat/completions
OpenAI-compatible. Same shape as the OpenAI Chat Completions API.

Supported fields: model, messages, max_tokens, system, stream, temperature, top_p, stop, tools, tool_choice, reasoning_effort, thinking_budget.

Reasoning control for thinking-capable models. Set reasoning_effort to one of "none", "low", "medium", "high" for preset budgets, or pass an explicit integer via thinking_budget for fine-grained control.

Multimodal content arrays are fully supported: image_url (URL or data: base64 URI), input_audio, and video_url.

Tool use: tools, tool_choice, role:"tool" messages, and assistant.tool_calls all work. Streaming emits OpenAI-shape tool_calls deltas.

System prompts work either via top-level system or as a role:"system" message — both paths are normalized.

#### cURL
```bash
curl https://api.aklaude.xyz/api/proxy/v1/chat/completions \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [
      {"role": "system", "content": "You are a precise SQL tutor."},
      {"role": "user", "content": "Explain window functions in two sentences."}
    ],
    "stream": true,
    "temperature": 0.4
  }'
```

### POST /v1/messages

Anthropic-compatible. Same shape as the Anthropic Messages API. Use this for vision, tool use, extended thinking, and any Anthropic SDK consumer (including Claude Code CLI).

Full feature parity: messages (string or content blocks), system (string or text-block array), max_tokens, temperature, stream, tools, tool_choice, thinking.

Image content blocks and tool_use / tool_result blocks all flow through.

Extended thinking — pass "thinking": { "type": "enabled", "budget_tokens": 4096 } to enable.

Model aliases: Versioned Anthropic IDs resolve to the matching model — e.g. claude-fable-5-20250625 → claude-fable-5, claude-opus-4-8-20250630 → claude-opus-4-8, claude-sonnet-4-6-20250514 → claude-sonnet-4-6, claude-haiku-4-5-20251001 → claude-haiku-4-5. Older aliases like claude-sonnet-4-5 or claude-3-5-sonnet-20241022 also resolve to the current tier, so SDKs that pin to a specific version work out of the box.

#### cURL · text
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4-7",
    "max_tokens": 1024,
    "messages": [{"role":"user","content":"hi"}]
  }'
```
#### cURL · vision
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 512,
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image", "source": {"type": "url", "url": "https://example.com/photo.png"}}
      ]
    }]
  }'
```
#### cURL · tool use
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "tools": [{
      "name": "get_weather",
      "description": "Get the current weather",
      "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"]
      }
    }],
    "messages": [{"role":"user","content":"Weather in Berlin?"}]
  }'
```
### POST /api/imagegen/generate
Generate images. Returns stored image URLs (1-hour signed URLs). Supported fields: prompt (required, max 4000 chars), model, aspect_ratio, images (up to 10 reference images for editing).

Available models: nano-banana-pro (default), nano-banana-2. Cost: €0.03 per image.
#### cURL 
```bash
curl https://api.aklaude.xyz/api/imagegen/generate \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nano-banana-pro",
    "prompt": "A watercolor city skyline at dusk, cinematic lighting",
    "aspect_ratio": "16:9"
  }'
```
#### With reference images
```bash
curl https://api.aklaude.xyz/api/imagegen/generate \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nano-banana-pro",
    "prompt": "Place this character on a snowy mountain",
    "aspect_ratio": "16:9",
    "images": [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg…"
    ]
  }'
```
#### json
```bash
{
  "data": [
    { "path": "user-id/watercolor-skyline-a1b2c3d4.png", "url": "https://…signed-url…" }
  ]
}
```
## Models & Pricing
Every euro you top up gets multiplied by 10×

The input/output token pricing stays the same as Anthropic's official pricing. You just get 10× more credits for your money.

All prices per 1M tokens — same rates as Anthropic.

Model	Input	Output
Claude Opus 4.8	€5.00	€25.00
Claude Opus 4.7	€5.00	€25.00
Claude Sonnet 4.6	€3.00	€15.00
Claude Haiku 4.5	€1.00	€5.00

### Model IDs
Model	ID
Claude Opus 4.8	claude-opus-4-8

Claude Opus 4.7	claude-opus-4-7

Claude Sonnet 4.6	claude-sonnet-4-6

Claude Haiku 4.5	claude-haiku-4-5

### Cache Pricing (per 1M tokens)
Model	Cache Write	Cache Hit
Claude Opus 4.8	€6.25	€0.50
Claude Opus 4.7	€6.25	€0.50
Claude Sonnet 4.6	€3.75	€0.30
Claude Haiku 4.5	€1.25	€0.10

### Image Generation
Model	Price
nano-banana-pro	€0.03 / image
nano-banana-2	€0.03 / image

### Video Generation (per 8s clip)
Model	Price	Audio
veo-3.1	€1.50	Yes
veo-3.1-fast	€0.40	Yes
veo-3	€1.50	Yes
veo-3-fast	€0.40	Yes
veo-2	€1.80	No

## Multimodal Input
Both endpoints accept image, audio, and PDF input on every vision-capable model. Two reference forms, both fully supported:

Inline base64 — Anthropic {type:"image", source:{type:"base64", media_type, data}} or OpenAI data:image/png;base64,… URIs.
URL (https only) — Anthropic {type:"image", source:{type:"url", url}} or OpenAI image_url.url: "https://…".

### Anthropic · URL
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 512,
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image", "source": {"type": "url", "url": "https://example.com/photo.png"}}
      ]
    }]
  }'
```
### Anthropic · base64
```bash
B64=$(base64 -i photo.png)
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"claude-sonnet-4-6\",
    \"max_tokens\": 512,
    \"messages\": [{
      \"role\": \"user\",
      \"content\": [
        {\"type\": \"text\", \"text\": \"What is in this image?\"},
        {\"type\": \"image\", \"source\": {\"type\": \"base64\", \"media_type\": \"image/png\", \"data\": \"$B64\"}}
      ]
    }]
  }"
```
### OpenAI · image_url
```bash
curl https://api.aklaude.xyz/api/proxy/v1/chat/completions \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "Describe this image."},
        {"type": "image_url", "image_url": {"url": "https://example.com/photo.png"}}
      ]
    }]
  }'
```

## Tool Use (Function Calling)
Works on both endpoints, across every model in the catalog. Whichever shape your client speaks, point it at aKlaude and tools just work.

OpenAI shape on /v1/chat/completions — tools, tool_choice, role:"tool", assistant.tool_calls. Streaming emits tool_calls deltas.
Anthropic shape on /v1/messages — tools array, tool_use response blocks, tool_result in user follow-ups, input_json_delta streaming.
Translation between OpenAI and Anthropic tool shapes happens server-side and is transparent — your client sees the shape it asked for, no matter which model serves the request.
### Anthropic shape
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "tools": [{
      "name": "get_weather",
      "description": "Get the current weather",
      "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"]
      }
    }],
    "messages": [{"role":"user","content":"Weather in Berlin?"}]
  }'
```
### Openai shape
```bash
curl https://api.aklaude.xyz/api/proxy/v1/chat/completions \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{"role":"user","content":"Weather in Berlin?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather",
        "parameters": {
          "type": "object",
          "properties": {"location": {"type": "string"}},
          "required": ["location"]
        }
      }
    }]
  }'
```
## Video Generation
Generate video clips using Google Veo models. Submit a prompt, wait 30–90 seconds, get back 24-hour presigned URLs. Veo 3+ models generate native audio in the clip.
### POST /api/videogen/generate
Supported fields: prompt (required, max 4000 chars), model, ratio (16:9, 9:16), duration (8s), resolution (720p, 1080p), image (first-frame reference as data URL), end_image (last-frame reference), n (1–4 clips).
#### Text to video
```bash
curl https://api.aklaude.xyz/api/videogen/generate \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo-3.1-fast",
    "prompt": "A cinematic drone shot over a misty mountain range at sunrise",
    "ratio": "16:9",
    "duration": "8s"
  }'
```
#### Image to video
```bash
curl https://api.aklaude.xyz/api/videogen/generate \
  -H "Authorization: Bearer cr-sk-…" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo-3.1",
    "prompt": "Animate this character walking through a snowy forest",
    "ratio": "16:9",
    "duration": "8s",
    "image": "data:image/png;base64,iVBORw0KGgo…"
  }'
```
#### Response
```bash
{
  "data": [
    { "url": "https://…presigned-url…" }
  ]
}
```
## Video Models & Pricing
All prices per 8-second clip.

Model	Price	Audio
veo-3.1	€1.50	Yes
veo-3.1-fast	€0.40	Yes
veo-3	€1.50	Yes
veo-3-fast	€0.40	Yes
veo-2	€1.80	No

## Web Search & Tools
Enable built-in tools by passing web_search: { enabled: true } in your request. This is free — no external API key needed. The model gets access to web search, weather, stock prices, crypto prices, news, page fetching, and YouTube transcripts.

When enabled, the model can call tools server-side. Results are streamed back as search_status and tool_status SSE events.
#### Curl
```bash
curl https://api.aklaude.xyz/api/proxy/v1/messages \
  -H "x-api-key: cr-sk-…" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 4096,
    "web_search": { "enabled": true },
    "messages": [{"role":"user","content":"What happened in tech news today?"}]
  }'
```
Available tools: web_search, get_weather, get_stock_price, get_crypto_price, get_news, fetch_page, youtube_transcript.
You can also bring your own search key — pass provider (tavily or brave) and apiKey to override the built-in search.

## Streaming
### OpenAI shape (/v1/chat/completions)
SSE with data: {"object":"chat.completion.chunk",...} frames, terminated by data: [DONE]. Each chunk carries choices[0].delta.content for text, or choices[0].delta.tool_calls for function-call deltas. Final chunk has choices[0].finish_reason set to "stop" for plain text or "tool_calls" when the model is asking to call a function, plus a usage object.

### Anthropic shape (/v1/messages)
Full Anthropic event sequence: message_start → content_block_start → content_block_delta ×N → content_block_stop → message_delta → message_stop. Tool-use blocks emit input_json_delta with the full args.

## Prompt Caching
Pass cache_control headers in your request — upstream honours them for latency wins. Cache pricing is applied automatically.

Cache reads: 10% of input rate per model.
Cache writes: 125% of input rate (one-time premium per cached prefix; break-even after ~2 reads).
Output tokens: unaffected, always at standard rate.
Quality is identical with caching on or off. Caching only changes billing — the model still runs full inference on every call.

### Error Codes
aKlaude returns standard HTTP status codes. Error responses include a JSON body with an error field.

Code	Meaning	Common Cause
400	Bad request	Invalid model, missing messages, or unsupported parameters
401	Unauthorized	Missing or invalid API key
402	Insufficient balance	Add credits in your dashboard
403	Forbidden	Account suspended or response blocked by security filter
429	Rate limit exceeded	Slow down or contact support for higher limits
500	Internal error	Infrastructure error — never leaks upstream error bodies
502	Bad gateway	Upstream returned an invalid or malformed response
503	Service unavailable	Proxy temporarily disabled or spending limit reached
All error responses follow the SDK shape per route: OpenAI-style { error: { message, type } } on /v1/chat/completions; Anthropic-style { type: "error", error: { type, message } } on /v1/messages.

### Rate Limits
Rate limits are set per API key and enforced using a sliding window algorithm. Limits are shown in your dashboard under key settings.

Limit	Default	Description
rpm	60	Requests per minute
rpd	1000	Requests per day
When a limit is exceeded, the API returns 429 Too Many Requests.

Pre-call balance reservation: every call pre-debits a worst-case cost before hitting upstream. Insufficient balance returns 402 immediately, no upstream burn.