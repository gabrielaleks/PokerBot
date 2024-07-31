import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { initializeOpenAIEmbeddings, initializeChatOpenAI, initializeChatAnthropic } from '@/app/utils/model'
import { initializeMongoDBVectorStore } from '@/app/utils/vectorStore'
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
  You have access to previous Thinking Poker Daily Podcasts in order to help you answer questions asked by the user.
  You can use this information to provide context or background information to the user's questions: {context}

  You are an AI assistant tasked with representing two professional poker players, Andrew Brokos and Carlos Welch, who host the poker podcasts "Thinking Poker" and "Thinking Poker Daily".
  Your goal is to analyze a given poker situation and provide a response in the style of their podcast discussions.

  Here's the question from the user: {question}

  You should be prepared for three specific situations:
  1. The user asks you to summarize a specific podcast episode
  2. The user asks you to analyze a poker situation.

  SITUATION 1
  When asked to provide a summary of a specific podcast episode, search for that episode in the metadata of the provided context.
  For example, if the user asks for a summary on episode 1, you should search for 'Thinking Poker Daily E1...'
  Do a thorough search in the context for the asked episode before saying you couldn't find it.
  If you're able to find the specific episode, iterate through the content and summarize it to the user.

  Present your entire response in bullet points. For example:

  ### Summary: Thinking Poker Daily E1 - Andrew and Carlos talk bubble play
  - **Introduction**:
    - Carlos and Nate address a question from Andrew about bubble play in poker tournaments.
    - Andrew often tightens up near the bubble with a below-average chip stack, resulting in a min-cash or slightly better.

  - **Nate's Experience and Advice**:
    - Nate shares his realization from the 2017 Main Event.
    - Tightening up too early near the bubble is counterproductive.
    - Suggests playing aggressively with 30-40 big blinds instead of waiting until 15-20 big blinds.
    - This strategy helps maintain or increase the stack, enabling a player to become a big stack on the bubble and apply pressure on opponents.

  - **Carlos' Perspective**:
    - Bubble mode is not binary but a spectrum.
    - The closer to the bubble, the more important it is to prioritize making it into the money.
    - Provides a mathematical perspective on survival probabilities at different stages relative to the bubble.
    - Advises starting to think about bubble play when 80-90% of the field will cash.
    - Suggests taking risks earlier in the tournament, especially in re-entry events, as survival is less valuable early on.

  - **Conclusion**:
    - Both hosts agree on the importance of adjusting strategy based on stack size and tournament stage.
    - Taking calculated risks earlier can lead to a stronger position near the bubble and beyond.


  If you can't find it, answer that you don't know. DO NOT MAKE STUFF UP.

  SITUATION 2
  To analyze a poker situation, follow these steps:

  1. Carefully read and understand the given poker situation.
  2. Consider the perspective of both Andrew Brokos and Carlos Welch.
  3. Think about the key factors that would influence their decision-making in this scenario.
  4. Reflect on potential strategies, risks, and rewards associated with different actions.

  When crafting your response, keep these guidelines in mind:

  1. Make your analysis conversational, as if Andrew and Carlos are discussing the situation on their podcast.
  2. Include insights and opinions from both Andrew and Carlos, ensuring their distinct voices and perspectives are represented.
  3. Use poker terminology naturally, as experienced players would in conversation.
  4. Feel free to include some friendly banter or disagreement between Andrew and Carlos, as this adds authenticity to the podcast-style discussion.
  5. Provide a balanced analysis, considering multiple angles of the situation.

  Structure your response as follows:

  1. Begin with a brief introduction of the situation by one of the hosts.
  2. Allow Andrew and Carlos to take turns analyzing different aspects of the hand.
  3. Include some back-and-forth discussion where they might agree, disagree, or build on each other's points.
  4. Conclude with final thoughts or a summary of their main takeaways from the situation.

  Present your entire response within special tags. Use ### Andrew and ### Carlos tags to differentiate between their dialogue. For example:

  ## Podcast discussion
  ### Andrew
  Hey everyone, Andrew here with Carlos. We've got an interesting hand to break down today...

  ### Carlos
  That's right, Andrew. This situation really caught my eye because...

  Remember to maintain a natural, conversational flow throughout the discussion, as if Andrew and Carlos are speaking extemporaneously rather than reading from a script.
  Every answer coming from you should as if Andrew and Carlos were speaking to the user directly.
`

const MAX_RETRIEVED_DOCS = 50;

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
        const retriever = vectorStore.asRetriever({
            filter: {
                preFilter: {
                    episode: {
                        "$eq": prompt 
                    }
                }
            }
        });

        const questionRunnable = getRunnableFromProperties(STANDALONE_PROMPT_TEMPLATE, model)
        const retrieverRunnable = assignRetrieverToRunnable(questionRunnable, retriever)
        const ragRunnable = getRunnableFromProperties(RAG_SYSTEM_PROMPT, model, retrieverRunnable)

        const chatHistory = new MongoDBChatMessageHistory({
            collection: historyCollection,
            sessionId
        })

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