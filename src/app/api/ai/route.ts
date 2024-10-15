import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { initializeOpenAIEmbeddings, initializeChatOpenAI, initializeChatAnthropic } from '@/app/utils/model'
import { enhancedRetriever, initializeMongoDBVectorStore } from '@/app/utils/vectorStore'
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { assignRetrieverToRunnable, getRunnableWithMessageHistory, getRunnableFromProperties } from '@/app/utils/runnables';
import {
    GPT3_5_OPENAI_MODEL,
    GPT4_OPENAI_MODEL,
    GPT4O_OPENAI_MODEL,
    CLAUDE_3_5_SONNET_MODEL,
    CLAUDE_3_OPUS_MODEL,
    CLAUDE_3_HAIKU_MODEL
} from '@/app/utils/const';

const STANDALONE_PROMPT_TEMPLATE = `
Given a chat history and a follow-up question, rephrase the follow-up question to be a standalone question.
Do NOT answer the question, just reformulate it if needed, otherwise return it as is.
Only return the final standalone question.`

const RAG_SYSTEM_PROMPT = `
  You are an AI assistant representing Andrew Brokos and Carlos Welch, hosts of the poker podcasts "Thinking Poker" and "Thinking Poker Daily". Your task is to answer questions about their podcasts using the information provided to you.
  Here is some context information you can use to provide background or additional details when answering questions:
  {context}

	You should be prepared to handle three specific situations:

	1. Summarizing a specific podcast episode:
		If asked to provide a summary of a specific podcast episode, you will receive the episode content. The document already contains the summary. Return this summary to the user without altering anything. If you cannot find any record associated with the specific episode, inform the user that you have no record for that episode.

	2. Finding episodes with specific tags:
		If asked to find episodes containing specific tag(s), follow these steps:
		a. Search the podcast database for episodes matching the requested tag(s).
		b. If there are matches, list the episodes with their titles in numerical order. For example:

		### Episodes with tag 'stack size'
		- Episode 1: Andrew and Carlos talk bubble play
		- Episode 8: Carlos and Nate face a preflop jam with AQ
		- Episode 17: Carlos helps Andrew with a bubble spot

		Include EVERY episode that you have access to in your response.

		c. If no matches are found, inform the user that there are no episodes with the specified tag(s).
    
    3. Listing the tags for a specific episode:
        If asked to provide the tags of a specific podcast episode, you should return the tags that you see in the metadata of the document.
        The document has already been filtered down to the correct one, so you should just list the tags in bullet points. For example:

        ### Tags for Episode 34
        - tournament
        - carlos
        - draw
        - bet size
        - bluffing
        - preflop
        - stack size
        - should i call

	General guidelines:
	- Be polite and professional in your responses.
	- If you don't have information to answer a question, clearly state that you don't know or don't have that information.
	- Do not make up or invent information that is not provided to you.
	- Use the context information when appropriate to provide additional details or background.

	Now, please process the following question from the user and respond accordingly:
  {question}
`

export async function POST(request: Request) {
    const body = await request.json()
    const bodySchema = z.object({
        prompt: z.string(),
        sessionId: z.string(),
        modelName: z.string()
    })

    const { prompt, sessionId, modelName } = bodySchema.parse(body)

    try {
        const historyCollection = await getDatabaseConnectionToCollection('history')
        const documentsCollection = await getDatabaseConnectionToCollection('embeddings')

        let model;
        switch (modelName) {
            case (GPT3_5_OPENAI_MODEL):
            case (GPT4_OPENAI_MODEL):
            case (GPT4O_OPENAI_MODEL):
                model = initializeChatOpenAI(modelName);
                break
            case (CLAUDE_3_HAIKU_MODEL):
            case (CLAUDE_3_OPUS_MODEL):
            case (CLAUDE_3_5_SONNET_MODEL):
                model = initializeChatAnthropic(modelName);
                break
            default:
                throw new Error(`Unsupported model name: ${modelName}.`);
        }

        const embeddings = initializeOpenAIEmbeddings()
        const vectorStore = initializeMongoDBVectorStore(embeddings, documentsCollection)
        
        const chatHistory = new MongoDBChatMessageHistory({
            collection: historyCollection,
            sessionId
        })

        const retriever = async (query: string) => enhancedRetriever(vectorStore, query);
        
        const questionRunnable = getRunnableFromProperties(STANDALONE_PROMPT_TEMPLATE, model)
        const retrieverRunnable = assignRetrieverToRunnable(questionRunnable, retriever)
        const ragRunnable = getRunnableFromProperties(RAG_SYSTEM_PROMPT, model, retrieverRunnable)
        
        const RunnableWithMessageHistory = getRunnableWithMessageHistory(ragRunnable, chatHistory)
        
        const stream = await RunnableWithMessageHistory.stream({ question: prompt }, { configurable: { sessionId: sessionId } })

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        })
    } catch (error) {
        console.log('error', error)
        return new NextResponse(JSON.stringify({ error }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        })
    }
}