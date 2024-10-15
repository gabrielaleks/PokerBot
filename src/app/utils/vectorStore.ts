import { MongoDBAtlasVectorSearch, MongoDBChatMessageHistory } from '@langchain/mongodb';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Collection } from 'mongodb';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

export function initializeMongoDBVectorStore(
    embeddings: OpenAIEmbeddings,
    collection: Collection
) {
    return new MongoDBAtlasVectorSearch(embeddings, {
        collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding"
    });
}

export async function enhancedRetriever(
    vectorStore: MongoDBAtlasVectorSearch,
    query: string,
    k: number = 50
): Promise<Document[]> {
    const llm = new ChatOpenAI({
        model: "gpt-4o",
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0,
    });
    const template = `
        Analyze the following context and query:
        {query}
        
        1. IF the user mentions episode numbers, extract all episode numbers mentioned.
        2. IF the user mentions episode tags, extract tags mentioned.
        3. IF the user's message doesn't fit any of the conditions above, return an empty json.

        Respond in JSON format:
        {{
            "episodeNumbers": [list of numbers or empty array],
            "episodeTags": [list of identified tags or empty array]
        }}
    `;

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const outputParser = new JsonOutputParser();
    const llmChain = prompt.pipe(llm).pipe(outputParser);
    const { episodeNumbers, episodeTags } = await llmChain.invoke({ query });

    let preFilter: any = {};

    if (episodeNumbers.length > 0) {
        preFilter.episode_number = { "$in": episodeNumbers };
    }

    if (episodeTags.length > 0) {
        preFilter.episode_tags = { "$in": episodeTags.map((tag: string) => tag.toLowerCase()) };
    }

    let results: Document[] = [];

    if (Object.keys(preFilter).length > 0) {
        results = await vectorStore.similaritySearch(query, k, { preFilter });
    } else {
        results = await vectorStore.similaritySearch(query, k);
    }

    // Merge episode tags into pageContent
    results = results.map(result => {
        const tags = result.metadata.episode_tags || [];
        const tagString = tags.length > 0 ? `Tags: ${tags.join(', ')}` : '';
        result.pageContent = `${result.pageContent}\n\n${tagString}`;
        return result;
    });

    console.log(results);

    //// Logging
    console.log('From user query: Episode numbers -> ' + episodeNumbers);
    console.log('From user query: Episode tags -> ' + episodeTags.map((tag: string) => tag.toLowerCase()));
    console.log("\n--- Episodes filtered: ---")
    for (const result of results) {
        console.log(result.metadata.episode_name);
    }
    console.log("--------------------------\n")
    ////

    return results;
}