import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from "@langchain/anthropic";

export function initializeOpenAIEmbeddings() {
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
}

export function initializeChatOpenAI(modelName: string) {
  return new ChatOpenAI({
    modelName: modelName,
    openAIApiKey: process.env.OPENAI_API_KEY,
    // Between 0 and 1. Lower value are deterministic, while higher are random
    temperature: 0,
    // If true, tokens will be sent as server-sent events as they become available
    streaming: true,
    // Max number of tokens to be generated in chat completion
    maxTokens: 4096
  });
}

export function initializeChatAnthropic(modelName: string) {
  return new ChatAnthropic({
    model: modelName,
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0,
    maxTokens: 1024
  })
}