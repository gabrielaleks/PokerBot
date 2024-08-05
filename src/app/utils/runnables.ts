import { BaseListChatMessageHistory } from "@langchain/core/chat_history"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import {
  Runnable,
  RunnablePassthrough,
  RunnableSequence,
  RunnableWithMessageHistory
} from "@langchain/core/runnables"
import { formatDocumentsAsString } from "langchain/util/document"
import { Document } from '@langchain/core/documents';

export function getRunnableFromProperties(
  prompt: string,
  model: any,
  pastRunnable?: Runnable
): RunnableSequence {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", prompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{question}"],
  ])

  const runnableSequence = pastRunnable
    ? RunnableSequence.from([pastRunnable, promptTemplate, model, new StringOutputParser()])
    : RunnableSequence.from([promptTemplate, model, new StringOutputParser()]);

  return runnableSequence;
}

export function assignRetrieverToRunnable(
  chain: RunnableSequence,
  retriever: (query: string) => Promise<Document[]>
): RunnablePassthrough<any> {
  return RunnablePassthrough.assign({
    context: async (input: any) => {
      const docs = await retriever(input.question);
      return formatDocumentsAsString(docs);
    }
  })
}

export function getRunnableWithMessageHistory(
  chain: any,
  chatHistory: BaseListChatMessageHistory
): RunnableWithMessageHistory<any, any> {
  return new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: () => chatHistory,
    inputMessagesKey: "question",
    historyMessagesKey: "chat_history"
  })
}