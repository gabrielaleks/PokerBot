import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Collection } from 'mongodb';
import { Document } from '@langchain/core/documents';

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

export async function enhancedRetriever(vectorStore: MongoDBAtlasVectorSearch, query: string, k: number = 20): Promise<Document[]> {
    // Extract episode numbers with AI
    const llm = new OpenAI({ temperature: 0 });
        const aiResponse = await llm.invoke(
            `Extract all episode numbers mentioned in the following query.
            Only respond with a comma-separated list of numbers, or "None" if no episode numbers are mentioned: "${query}"`
        );
    let episodeNumbers = extractNumbers(aiResponse);

    let results: Document[] = [];
    
    if (episodeNumbers.length > 0) {
        results = await vectorStore.similaritySearch(query, k, {
            preFilter: {
                "episode_number": { "$in": episodeNumbers }
            }
        });
    }

	// If no results or no episode number provided, fall back to regular semantic search
	if (results.length === 0) {
		results = await vectorStore.similaritySearch(query, k);
	}

	return results;
}

function extractNumbers(text: string): number[] {
    const numbers = text.match(/\d+/g);
    return numbers ? numbers.map(Number) : [];
}