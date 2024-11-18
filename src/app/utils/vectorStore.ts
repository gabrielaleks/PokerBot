import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Collection } from 'mongodb';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PRE_DEFINED_TAGS } from './const';
import { VectorStore } from '@langchain/core/vectorstores';

export function initializeMongoDBVectorStore(
	embeddings: OpenAIEmbeddings,
	collection: Collection
): VectorStore {
	return new MongoDBAtlasVectorSearch(embeddings, {
		collection,
		indexName: "vector_index",
		textKey: "text",
		embeddingKey: "embedding"
	});
}

export async function fetchDocumentsFromVectorStore(
	vectorStore: VectorStore,
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
        2. IF the user mentions episode tags directly or describes concepts that map to our tags, extract those tags.
        3. IF the user's query implies that ALL mentioned concepts should be present (e.g., "episodes about X and Y" or "episodes that discuss X while doing Y"),
           set requireAllTags to true. Otherwise (e.g., "episodes about X or Y"), set it to false.
        4. IF the user asks about which episodes fit a certain condition, you should see if that condition fits one (or more) of the pre-existing tags.
           If it does, return that tag/tags. If not, return empty.
           See list of possible tags below. REFRAIN to this list.
        5. You should return the type of request made by the user. Choose from this list:
            - "summary" (if the user request is to summarize episodes)
            - "listOfTags" (if the user request is to provide a list of existing tags)
            - "tagsInEpisode" (if the user request is to provide list of tags for a specific episode)
            - "searchWithTags" (if the user request is to find episodes that contain a specific tag or set of tags)
            - "other" (if the user request doesn't fit the previous cases)

           ${PRE_DEFINED_TAGS}
           
        5. IF the user's message doesn't fit any of the conditions above, return an empty json.

        Respond in JSON format:
        {{
            "episodeNumbers": [list of numbers or empty array],
            "episodeTags": [list of identified tags or empty array],
            "requireAllTags": boolean,
            "typeOfRequest": [string with type of request]
        }}
    `;

	const prompt = ChatPromptTemplate.fromTemplate(template);
	const outputParser = new JsonOutputParser();
	const llmChain = prompt.pipe(llm).pipe(outputParser);
	const { episodeNumbers, episodeTags, requireAllTags, typeOfRequest } = await llmChain.invoke({ query });

	let preFilter: any = {};
	const lowercaseTags = episodeTags.map((tag: string) => tag.toLowerCase());

	if (episodeNumbers.length > 0) {
		preFilter.episode_number = { "$in": episodeNumbers };
	}

	if (episodeTags.length > 0) {
		if (requireAllTags && episodeTags.length > 1) {
			// Use $and with multiple $in conditions to simulate AND logic
			preFilter["$and"] = lowercaseTags.map((tag: string) => ({
				episode_tags: { "$in": [tag] }
			}));
		} else {
			// Use $in for OR logic
			preFilter.episode_tags = { "$in": lowercaseTags };
		}
	}

	let results: Document[] = [];

	if (Object.keys(preFilter).length > 0) {
		results = await vectorStore.similaritySearch(query, k, { preFilter });
	} else {
		results = await vectorStore.similaritySearch(query, 4);
	}

  if (typeOfRequest == "searchWithTags") {
    results = results.map((result, index) => {
      const { metadata } = result;
      // Create a more structured format
      return new Document({
        pageContent: `EPISODE_ENTRY_${index + 1}:\nNumber: ${metadata.episode_number}\nTitle: ${metadata.episode_name}`,
        metadata: {
          episode_number: metadata.episode_number,
          episode_name: metadata.episode_name,
          episode_tags: metadata.episode_tags || [],
        }
      });
    });

    // Sort by episode number
    results.sort((a, b) =>
      (a.metadata.episode_number || 0) - (b.metadata.episode_number || 0)
    );
    
    const countDocument = new Document({
      pageContent: `TOTAL_EPISODES: ${results.length} 
!!!IMPORTANT!!! YOU MUST LIST ALL ${results.length} EPISODES IN YOUR RESPONSE
!!!IMPORTANT!!! DO NOT SKIP ANY EPISODES`,
      metadata: {}
		});
    
    results.unshift(countDocument);
  } else if (typeOfRequest == "summary") {
		results = results.map(result => {
			const tags = result.metadata.episode_tags || [];
			const tagString = tags.length > 0 ? `Tags: ${tags.join(', ')}` : '';
			result.pageContent = `${result.pageContent}\n\n${tagString}`;
			return result;
		});
	} else if (typeOfRequest == "tagsInEpisode") {
		results = results.map(result => {
			result.pageContent = result.metadata.episode_tags;
			return result;
		});
	} else if (typeOfRequest == "listOfTags") {
		const documentWithTags = new Document({
			pageContent: PRE_DEFINED_TAGS
		});

		results = [documentWithTags];
	}

	return results;
}