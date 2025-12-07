var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-HXXM4U/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// ../.wrangler/tmp/bundle-HXXM4U/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// api/lib/agent-core.ts
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}
__name(generateId, "generateId");
var AgentRuntime = class {
  agent;
  ai;
  runState;
  constructor(agent, ai, sessionId) {
    this.agent = agent;
    this.ai = ai;
    this.runState = {
      sessionId: sessionId || generateId(),
      phase: "idle",
      steps: [],
      currentStepIndex: -1,
      startTime: Date.now()
    };
  }
  /**
   * 添加执行步骤
   */
  addStep(step) {
    const fullStep = {
      ...step,
      id: generateId(),
      timestamp: Date.now()
    };
    this.runState.steps.push(fullStep);
    this.runState.currentStepIndex = this.runState.steps.length - 1;
    return fullStep;
  }
  /**
   * 更新运行阶段
   */
  setPhase(phase) {
    this.runState.phase = phase;
  }
  /**
   * 获取工具上下文
   */
  getToolContext() {
    return {
      ai: this.ai,
      sessionId: this.runState.sessionId,
      addStep: (step) => this.addStep(step)
    };
  }
  /**
   * 构建工具描述（用于 LLM function calling）
   */
  buildToolsDescription() {
    if (this.agent.tools.length === 0)
      return "";
    const toolsDesc = this.agent.tools.map((tool) => {
      const paramsDesc = Object.entries(tool.parameters.properties).map(([name, prop]) => `    - ${name} (${prop.type}): ${prop.description}`).join("\n");
      return `- ${tool.name}: ${tool.description}
  \u53C2\u6570:
${paramsDesc}`;
    }).join("\n\n");
    return `

\u4F60\u53EF\u4EE5\u4F7F\u7528\u4EE5\u4E0B\u5DE5\u5177\uFF1A
${toolsDesc}

\u5F53\u9700\u8981\u4F7F\u7528\u5DE5\u5177\u65F6\uFF0C\u8BF7\u6309\u4EE5\u4E0B JSON \u683C\u5F0F\u8F93\u51FA\uFF1A
{"tool": "\u5DE5\u5177\u540D", "params": {\u53C2\u6570\u5BF9\u8C61}}`;
  }
  /**
   * 解析 LLM 输出中的工具调用
   */
  parseToolCall(response) {
    const jsonMatch = response.match(/\{[\s\S]*?"tool"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tool && typeof parsed.tool === "string") {
          return {
            tool: parsed.tool,
            params: parsed.params || {}
          };
        }
      } catch {
      }
    }
    return null;
  }
  /**
   * 执行单个工具
   */
  async executeTool(toolName, params) {
    const tool = this.agent.tools.find((t) => t.name === toolName);
    if (!tool) {
      return { success: false, error: `\u672A\u77E5\u5DE5\u5177: ${toolName}` };
    }
    const toolCall = {
      id: generateId(),
      name: toolName,
      description: tool.description,
      input: params,
      status: "running",
      startTime: Date.now()
    };
    this.addStep({
      type: "tool_call",
      content: `\u8C03\u7528\u5DE5\u5177: ${toolName}`,
      metadata: { tool: toolCall, phase: "tool_calling" }
    });
    try {
      const result = await tool.execute(params, this.getToolContext());
      toolCall.output = result;
      toolCall.status = "completed";
      toolCall.endTime = Date.now();
      this.addStep({
        type: "tool_result",
        content: `\u5DE5\u5177 ${toolName} \u6267\u884C\u5B8C\u6210`,
        metadata: { tool: toolCall }
      });
      return { success: true, result };
    } catch (error) {
      toolCall.status = "error";
      toolCall.error = error instanceof Error ? error.message : String(error);
      toolCall.endTime = Date.now();
      this.addStep({
        type: "tool_result",
        content: `\u5DE5\u5177 ${toolName} \u6267\u884C\u5931\u8D25: ${toolCall.error}`,
        metadata: { tool: toolCall }
      });
      return { success: false, error: toolCall.error };
    }
  }
  /**
   * 调用 LLM
   */
  async callLLM(messages) {
    this.addStep({
      type: "llm_thinking",
      content: "\u6B63\u5728\u601D\u8003...",
      metadata: { model: this.agent.model, phase: "understanding" }
    });
    try {
      const response = await this.ai.run(this.agent.model, { messages });
      const text = response?.response || "";
      this.addStep({
        type: "llm_thinking",
        content: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
        metadata: { model: this.agent.model }
      });
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM \u8C03\u7528\u5931\u8D25: ${errorMsg}`);
    }
  }
  /**
   * 主运行方法 - ReAct 模式
   * Think → Act → Observe → 循环
   */
  async run(userInput) {
    this.setPhase("understanding");
    this.addStep({
      type: "user_input",
      content: userInput,
      metadata: { phase: "understanding" }
    });
    const systemPrompt = this.agent.systemPrompt + this.buildToolsDescription();
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ];
    const maxIterations = 5;
    let result = null;
    const toolResults = {};
    for (let i = 0; i < maxIterations; i++) {
      this.setPhase(i === 0 ? "planning" : "tool_calling");
      const llmResponse = await this.callLLM(messages);
      const toolCallRequest = this.parseToolCall(llmResponse);
      if (toolCallRequest) {
        const toolExecution = await this.executeTool(
          toolCallRequest.tool,
          toolCallRequest.params
        );
        if (toolExecution.success) {
          toolResults[toolCallRequest.tool] = toolExecution.result;
          messages.push({ role: "assistant", content: llmResponse });
          messages.push({
            role: "user",
            content: `\u5DE5\u5177 ${toolCallRequest.tool} \u7684\u6267\u884C\u7ED3\u679C\uFF1A${JSON.stringify(toolExecution.result)}`
          });
        } else {
          messages.push({ role: "assistant", content: llmResponse });
          messages.push({
            role: "user",
            content: `\u5DE5\u5177\u6267\u884C\u5931\u8D25\uFF1A${toolExecution.error}`
          });
        }
      } else {
        result = {
          response: llmResponse,
          toolResults
        };
        break;
      }
    }
    this.setPhase("completed");
    this.runState.endTime = Date.now();
    this.addStep({
      type: "final_output",
      content: "\u4EFB\u52A1\u5B8C\u6210",
      metadata: { phase: "completed" }
    });
    return {
      result,
      runState: this.runState
    };
  }
  /**
   * 获取当前运行状态
   */
  getRunState() {
    return this.runState;
  }
};
__name(AgentRuntime, "AgentRuntime");
function createAgent(definition) {
  return {
    definition,
    run: async (userInput, ai, sessionId) => {
      const runtime = new AgentRuntime(definition, ai, sessionId);
      return runtime.run(userInput);
    }
  };
}
__name(createAgent, "createAgent");

// api/lib/word-card-agent.ts
var extractEntitiesTools = {
  name: "extract_entities",
  description: "\u4ECE\u7528\u6237\u8F93\u5165\u4E2D\u63D0\u53D6\u5B9E\u4F53\uFF08\u7269\u4F53\u3001\u52A8\u7269\u3001\u4EA4\u901A\u5DE5\u5177\u7B49\uFF09\u53CA\u5176\u5C5E\u6027\uFF08\u989C\u8272\u3001\u5927\u5C0F\u7B49\uFF09",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "\u7528\u6237\u7684\u8F93\u5165\u6587\u672C"
      }
    },
    required: ["text"]
  },
  execute: async (input, context) => {
    const { ai } = context;
    const prompt = `\u5206\u6790\u4EE5\u4E0B\u6587\u672C\uFF0C\u63D0\u53D6\u5176\u4E2D\u7684\u5B9E\u4F53\uFF08\u540D\u8BCD\uFF1A\u52A8\u7269\u3001\u7269\u4F53\u3001\u4EA4\u901A\u5DE5\u5177\u3001\u98DF\u7269\u7B49\uFF09\u53CA\u5176\u5C5E\u6027\u3002

\u8F93\u5165\u6587\u672C: "${input.text}"

\u8BF7\u4EE5 JSON \u683C\u5F0F\u8F93\u51FA\uFF0C\u683C\u5F0F\u5982\u4E0B\uFF1A
{
  "entities": [
    {
      "name": "\u5B9E\u4F53\u7684\u4E2D\u6587\u540D\u79F0",
      "nameEn": "English name",
      "category": "\u7C7B\u522B(animal/vehicle/food/object/person/place)",
      "attributes": ["\u5C5E\u60271", "\u5C5E\u60272"],
      "imagePrompt": "\u7528\u4E8E\u751F\u6210\u56FE\u7247\u7684\u82F1\u6587\u63CF\u8FF0\uFF0C\u8981\u5177\u4F53\u751F\u52A8"
    }
  ]
}

\u6CE8\u610F\uFF1A
1. imagePrompt \u8981\u7528\u82F1\u6587\uFF0C\u63CF\u8FF0\u8981\u5177\u4F53\uFF0C\u5305\u542B\u5C5E\u6027\uFF08\u5982\u989C\u8272\u3001\u5927\u5C0F\uFF09
2. \u5982\u679C\u6709\u591A\u4E2A\u5B9E\u4F53\uFF0C\u90FD\u8981\u63D0\u53D6\u51FA\u6765
3. \u53EA\u8F93\u51FA JSON\uFF0C\u4E0D\u8981\u5176\u4ED6\u6587\u5B57`;
    try {
      const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8BED\u8A00\u5206\u6790\u52A9\u624B\uFF0C\u4E13\u95E8\u63D0\u53D6\u6587\u672C\u4E2D\u7684\u5B9E\u4F53\u4FE1\u606F\u3002\u53EA\u8F93\u51FA JSON \u683C\u5F0F\u3002" },
          { role: "user", content: prompt }
        ]
      });
      const text = response?.response || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { entities: parsed.entities || [] };
      }
      return { entities: [] };
    } catch (error) {
      console.error("Entity extraction failed:", error);
      return {
        entities: [{
          name: input.text,
          nameEn: input.text,
          category: "object",
          attributes: [],
          imagePrompt: input.text
        }]
      };
    }
  }
};
var generateImageTool = {
  name: "generate_image",
  description: "\u6839\u636E\u63CF\u8FF0\u751F\u6210\u56FE\u7247",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "\u56FE\u7247\u63CF\u8FF0\uFF08\u82F1\u6587\uFF09"
      },
      entityName: {
        type: "string",
        description: "\u5B9E\u4F53\u540D\u79F0\uFF08\u7528\u4E8E\u6807\u8BC6\uFF09"
      }
    },
    required: ["prompt", "entityName"]
  },
  execute: async (input, context) => {
    const { ai } = context;
    const enhancedPrompt = `${input.prompt}, cute cartoon style, vibrant colors, child-friendly, simple background, high quality illustration`;
    try {
      const response = await ai.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: enhancedPrompt,
        num_steps: 4
        // Flux schnell 推荐 4 步
      });
      let imageData;
      if (response instanceof ReadableStream) {
        const reader = response.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          if (value)
            chunks.push(value);
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        imageData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          imageData.set(chunk, offset);
          offset += chunk.length;
        }
      } else {
        imageData = new Uint8Array(response);
      }
      const base64 = btoa(String.fromCharCode(...imageData));
      return {
        imageBase64: `data:image/png;base64,${base64}`,
        prompt: enhancedPrompt
      };
    } catch (error) {
      console.error("Image generation failed:", error);
      throw new Error(`\u56FE\u7247\u751F\u6210\u5931\u8D25: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
var speechToTextTool = {
  name: "speech_to_text",
  description: "\u5C06\u8BED\u97F3\u8F6C\u6362\u4E3A\u6587\u5B57",
  parameters: {
    type: "object",
    properties: {
      audioBase64: {
        type: "string",
        description: "Base64 \u7F16\u7801\u7684\u97F3\u9891\u6570\u636E"
      }
    },
    required: ["audioBase64"]
  },
  execute: async (input, context) => {
    const { ai } = context;
    try {
      const audioData = Uint8Array.from(atob(input.audioBase64), (c) => c.charCodeAt(0));
      const response = await ai.run("@cf/openai/whisper", {
        audio: [...audioData]
      });
      return { text: response?.text || "" };
    } catch (error) {
      console.error("Speech to text failed:", error);
      throw new Error(`\u8BED\u97F3\u8BC6\u522B\u5931\u8D25: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
var wordCardAgent = createAgent({
  name: "word_card_wizard",
  description: "\u8BCD\u5361\u9B54\u6CD5\u5E08 - \u5E2E\u52A9\u5C0F\u670B\u53CB\u5B66\u4E60\u8BCD\u6C47",
  model: "@cf/meta/llama-3.1-8b-instruct",
  systemPrompt: `\u4F60\u662F"\u8BCD\u5361\u9B54\u6CD5\u5E08"\uFF0C\u4E00\u4E2A\u5E2E\u52A9\u5C0F\u670B\u53CB\u5B66\u4E60\u8BCD\u6C47\u7684 AI \u52A9\u624B\u3002

\u4F60\u7684\u4EFB\u52A1\u6D41\u7A0B\uFF1A
1. \u7406\u89E3\u7528\u6237\u8BF4\u7684\u8BCD\u6216\u53E5\u5B50
2. \u4F7F\u7528 extract_entities \u5DE5\u5177\u63D0\u53D6\u5176\u4E2D\u7684\u5B9E\u4F53\uFF08\u7269\u4F53\u3001\u52A8\u7269\u7B49\uFF09
3. \u5BF9\u6BCF\u4E2A\u5B9E\u4F53\uFF0C\u4F7F\u7528 generate_image \u5DE5\u5177\u751F\u6210\u53EF\u7231\u7684\u5361\u901A\u56FE\u7247
4. \u8FD4\u56DE\u5B8C\u6574\u7684\u8BCD\u5361\u4FE1\u606F

\u8BF7\u59CB\u7EC8\u4FDD\u6301\u53CB\u597D\u3001\u6D3B\u6CFC\u7684\u8BED\u6C14\uFF0C\u56E0\u4E3A\u4F60\u7684\u7528\u6237\u662F\u5C0F\u670B\u53CB\uFF01

\u8F93\u51FA\u683C\u5F0F\u8981\u6C42\uFF1A
- \u63D0\u53D6\u5B9E\u4F53\u65F6\uFF0C\u786E\u4FDD\u5305\u542B\u4E2D\u82F1\u6587\u540D\u79F0
- \u56FE\u7247\u63CF\u8FF0\u8981\u9002\u5408\u751F\u6210\u513F\u7AE5\u98CE\u683C\u7684\u5361\u901A\u56FE\u7247
- \u6700\u7EC8\u7ED3\u679C\u8981\u5305\u542B\u6240\u6709\u8BCD\u5361\u4FE1\u606F`,
  tools: [
    extractEntitiesTools,
    generateImageTool,
    speechToTextTool
  ]
});
async function generateWordCards(input, ai, onStep) {
  const steps = [];
  const addStep = /* @__PURE__ */ __name((type, content) => {
    steps.push({ type, content });
    onStep?.({ type, content });
  }, "addStep");
  addStep("user_input", input);
  addStep("understanding", "\u6B63\u5728\u7406\u89E3\u4F60\u8BF4\u7684\u8BDD...");
  addStep("tool_call", "\u8C03\u7528\u5B9E\u4F53\u63D0\u53D6\u5DE5\u5177");
  const context = {
    ai,
    sessionId: Math.random().toString(36).substring(2),
    addStep: () => {
    }
  };
  const extractionResult = await extractEntitiesTools.execute({ text: input }, context);
  const entities = extractionResult.entities;
  addStep("tool_result", `\u53D1\u73B0\u4E86 ${entities.length} \u4E2A\u5B9E\u4F53: ${entities.map((e) => e.name).join(", ")}`);
  const cards = [];
  for (const entity of entities) {
    addStep("tool_call", `\u6B63\u5728\u4E3A"${entity.name}"\u753B\u753B...`);
    try {
      const imageResult = await generateImageTool.execute(
        { prompt: entity.imagePrompt, entityName: entity.name },
        context
      );
      cards.push({
        entity,
        imageUrl: imageResult.imageBase64,
        pronunciation: `/${entity.nameEn.toLowerCase()}/`
        // 简化的音标
      });
      addStep("tool_result", `"${entity.name}"\u7684\u56FE\u7247\u753B\u597D\u4E86\uFF01`);
    } catch (error) {
      addStep("error", `\u751F\u6210"${entity.name}"\u7684\u56FE\u7247\u65F6\u51FA\u9519\u4E86`);
    }
  }
  addStep("completed", "\u8BCD\u5361\u751F\u6210\u5B8C\u6210\uFF01");
  return {
    originalInput: input,
    entities,
    cards
  };
}
__name(generateWordCards, "generateWordCards");

// api/agent.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var onRequestOptions = /* @__PURE__ */ __name(async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}, "onRequestOptions");
var onRequestPost = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { input, inputType, audioData, sessionId } = body;
    const runState = {
      sessionId: sessionId || Math.random().toString(36).substring(2),
      phase: "idle",
      steps: [],
      currentStepIndex: -1,
      startTime: Date.now()
    };
    let textInput = input;
    if (inputType === "audio" && audioData) {
      runState.phase = "understanding";
      runState.steps.push({
        id: Math.random().toString(36).substring(2),
        type: "tool_call",
        content: "\u6B63\u5728\u8BC6\u522B\u8BED\u97F3...",
        timestamp: Date.now(),
        metadata: { phase: "understanding" }
      });
      try {
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const whisperResponse = await env.AI.run("@cf/openai/whisper", {
          audio: [...bytes]
        });
        textInput = whisperResponse?.text || input;
        runState.steps.push({
          id: Math.random().toString(36).substring(2),
          type: "tool_result",
          content: `\u8BED\u97F3\u8BC6\u522B\u7ED3\u679C: "${textInput}"`,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Speech recognition failed:", error);
        runState.steps.push({
          id: Math.random().toString(36).substring(2),
          type: "tool_result",
          content: `\u8BED\u97F3\u8BC6\u522B\u5931\u8D25\uFF0C\u4F7F\u7528\u6587\u5B57\u8F93\u5165`,
          timestamp: Date.now()
        });
      }
    }
    const result = await generateWordCards(
      textInput,
      env.AI,
      (step) => {
        runState.steps.push({
          id: Math.random().toString(36).substring(2),
          type: step.type,
          content: step.content,
          timestamp: Date.now(),
          metadata: { phase: runState.phase }
        });
      }
    );
    runState.phase = "completed";
    runState.endTime = Date.now();
    const response = {
      success: true,
      result,
      runState
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Agent API error:", error);
    const response = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      runState: {
        sessionId: "error",
        phase: "error",
        steps: [{
          id: "error",
          type: "final_output",
          content: `\u9519\u8BEF: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now(),
          metadata: { phase: "error" }
        }],
        currentStepIndex: 0,
        startTime: Date.now(),
        endTime: Date.now()
      }
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}, "onRequestPost");
var onRequestGet = /* @__PURE__ */ __name(async () => {
  return new Response(JSON.stringify({ status: "ok", agent: "word_card_wizard" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}, "onRequestGet");

// api/_middleware.ts
var onRequest = /* @__PURE__ */ __name(async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const response = await context.next();
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    return newResponse;
  } catch (error) {
    console.error("Middleware error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}, "onRequest");

// ../.wrangler/tmp/pages-3qDW1x/functionsRoutes-0.8597268130254527.mjs
var routes = [
  {
    routePath: "/api/agent",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/agent",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/agent",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api",
    mountPath: "/api",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-HXXM4U/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-HXXM4U/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.11253672397011893.mjs.map
