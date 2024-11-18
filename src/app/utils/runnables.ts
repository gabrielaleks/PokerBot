import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import {
  RunnableSequence,
  RunnableWithMessageHistory
} from "@langchain/core/runnables"
import { MongoDBChatMessageHistory } from "@langchain/mongodb"
import { VectorStore } from "@langchain/core/vectorstores"
import { fetchDocumentsFromVectorStore } from "./vectorStore"

export async function getRunnableWithMessageHistory(
  chatHistory: MongoDBChatMessageHistory,
  standaloneSystemPrompt: string,
  model: any,
  vectorStore: VectorStore,
  prompt: string,
  ragSystemPrompt: string
) {
  const standaloneQuestionPrompt = ChatPromptTemplate.fromMessages([
    ["system", standaloneSystemPrompt],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);

  const questionChain = RunnableSequence.from([
    {
      question: (input) => input.question,
      history: (input) => input.history,
    },
    standaloneQuestionPrompt,
    model,
    new StringOutputParser(),
  ]);

  const documents = await fetchDocumentsFromVectorStore(vectorStore, prompt);
  const formattedContext = documents.map(doc => doc.pageContent).join('\n---\n');

  const ragPrompt = ChatPromptTemplate.fromMessages([
    ["system", ragSystemPrompt],
    new MessagesPlaceholder("history"),
    ["human", "{question}"],
  ]);

  const ragChain = RunnableSequence.from([
    {
      question: questionChain,
      context: async () => formattedContext,
      history: (input) => input.history,
    },
    ragPrompt,
    model,
    new StringOutputParser(),
  ]);

  const withMessageHistory = new RunnableWithMessageHistory({
    runnable: ragChain,
    getMessageHistory: () => chatHistory,
    inputMessagesKey: "question",
    historyMessagesKey: "history",
  });

  return withMessageHistory;
}