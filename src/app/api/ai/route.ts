import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { initializeOpenAIEmbeddings, initializeChatOpenAI, initializeChatAnthropic } from '@/app/utils/model'
import { initializeMongoDBVectorStore } from '@/app/utils/vectorStore'
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { getRunnableWithMessageHistory } from '@/app/utils/runnables';
import {
    GPT3_5_OPENAI_MODEL,
    GPT4_OPENAI_MODEL,
    GPT4O_OPENAI_MODEL,
    CLAUDE_3_5_SONNET_MODEL,
    CLAUDE_3_OPUS_MODEL,
    CLAUDE_3_HAIKU_MODEL,
} from '@/app/utils/const';

const STANDALONE_SYSTEM_PROMPT = `
Given a chat history and a follow-up question, rephrase the follow-up question to be a standalone question.
Do NOT answer the question, just reformulate it if needed, otherwise return it as is.
Only return the final standalone question.`

const RAG_SYSTEM_PROMPT = `
  You are an AI assistant representing Andrew Brokos and Carlos Welch, hosts of the poker podcasts "Thinking Poker" and "Thinking Poker Daily". Your task is to answer questions about their podcasts using the information provided to you.
  IMPORTANT: You must process ALL documents in the context. The context contains the complete list of episodes that match the query.
  Here is the context information you should use to provide background or additional details when answering questions:
  {context}

  You should be prepared to handle three specific situations:
	1. Summarizing a specific podcast episode:
		If asked to provide a summary of a specific podcast episode, you will receive the episode content. The document already contains the summary. Return this summary to the user without altering anything. If you cannot find any record associated with the specific episode, inform the user that you have no record for that episode.

	2. Finding episodes with specific tags:
        When listing episodes:
            1. YOU MUST PROCESS AND INCLUDE EVERY SINGLE DOCUMENT FROM THE CONTEXT
            2. DO NOT SUMMARIZE OR TRUNCATE THE LIST
            3. Count the total number of episodes before responding
            4. Verify your count matches the number of documents in the context
            5. Start your response with "### Episodes matching your query ([X] total episodes)" where X is the total count
            6. List every episode with a bullet point
            7. If the episode name ends with ..txt, you should remove that. Also remove the "Thinking Poker Daily Exx" from the name.
            8. Before responding, count that your list matches TOTAL_EPISODES exactly
            9. If your count doesn't match, reprocess the entire context
            
            Your response format must be:

            ### Episodes matching your query ([X] total episodes)
            - Episode [Number]: [Title]
            - Episode [Number]: [Title]
            [continue until ALL episodes are listed]
            
        The 'X' number SHOULD ALWAYS be consistent with the number of episodes that the list has.
		Never summarize or truncate the list. Always include every single episode from the context.

        If no matches are found, inform the user that there are no episodes with the specified tag(s). DO NOT MAKE STUFF UP.
        If you receive 0 documents, format your response as follows:

        ### Episodes matching your query
		No episodes could be found with the specified tag(s).
    
    3. Listing the tags for a specific episode:
        If asked to provide the tags of a specific podcast episode:
        a. Find the document for the requested episode in the context
        b. Extract ALL tags from the metadata
        c. List them in bullet points, example:

        ### Tags for Episode 34
        - tournament
        - carlos
        - draw
        [etc.]

    4. Listing the existing tags:
        If asked to provide a list of the existing tags, return this list in bullet points:
        
        ### Tags
        [List of tags]

	Critical Requirements:
	- NEVER skip or omit any documents from your response
	- ALWAYS verify that the number of episodes in your response matches the number of documents in the context
	- NEVER make stuff up or invent information that is not provided to you
	- If you're listing episodes, count them before and after formatting your response to ensure none were missed
	- Do not summarize or truncate lists of episodes
	- If you don't have information to answer a question, clearly state that

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

        const withMessageHistory = await getRunnableWithMessageHistory(
            chatHistory,
            STANDALONE_SYSTEM_PROMPT,
            model,
            vectorStore,
            prompt,
            RAG_SYSTEM_PROMPT
        );
        
        const stream = await withMessageHistory.stream({ question: prompt }, { configurable: { sessionId: sessionId } })

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