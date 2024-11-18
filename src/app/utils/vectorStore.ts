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

const MONGO_QUERY_TEMPLATE = `
You are a MongoDB query generator. Your task is to convert natural language queries about podcast episodes into MongoDB query objects.
You must ALWAYS respond with a valid JSON object.

Available fields in the documents:
- episode_number (number)
- episode_tags (array of strings)
- episode_name (string)

Types of requests:
1. "searchWithTags" - When user wants to find episodes with specific tags
2. "summary" - When user wants to get the summary of specific episode(s)
3. "listOfTags" - When user wants to see all available tags
4. "tagsInEpisode" - When user wants to see tags for specific episode(s)
5. "other" - For any other type of query

Available tags: ${PRE_DEFINED_TAGS}

Rules for query generation:
1. Support complex logical operations (AND, OR, NOT)
2. Handle numerical comparisons for episode numbers
3. Support array operations for tags
4. Return the appropriate type of request

Examples:
1. Query: "Show me episodes about flop or river"
  Response: {{
    "query": {{ "episode_tags": {{ "$in": ["flop", "river"] }} }},
    "typeOfRequest": "searchWithTags"
  }}

2. Query: "What's the summary of episode 123?"
  Response: {{
    "query": {{ "episode_number": 123 }},
    "typeOfRequest": "summary"
  }}

3. Query: "What tags are available?"
  Response: {{
    "query": {{}},
    "typeOfRequest": "listOfTags"
  }}
  
4. Query: "Show me episodes about flop and river"
  Response: {{
    "query": {{ 
      "$and": [
        {{ "episode_tags": "flop" }},
        {{ "episode_tags": "river" }}
      ]
    }},
    "typeOfRequest": "searchWithTags"
  }}

5. Query: "Show me episodes about flop but not river"
  Response: {{
    "query": {{
      "$and": [
        {{ "episode_tags": "flop" }},
        {{ "episode_tags": {{ "$ne": "river" }} }}
      ]
    }},
    "typeOfRequest": "searchWithTags"
  }}

6. Query: "What tags are in episode 456?"
  Response: {{
    "query": {{ "episode_number": 456 }},
    "typeOfRequest": "tagsInEpisode"
  }}

7. Query: "Show me tags for episodes 100, 200, and 300"
  Response: {{
    "query": {{ "episode_number": {{ "$in": [100, 200, 300] }} }},
    "typeOfRequest": "tagsInEpisode"
  }}

8. Query: "Show me episodes between 100 and 200 that talk about bubble"
  Response: {{
    "query": {{
      "$and": [
        {{ "episode_number": {{ "$gte": 100, "$lte": 200 }} }},
        {{ "episode_tags": "bubble" }}
      ]
    }},
    "typeOfRequest": "searchWithTags"
  }}

9. Query: "Hello!"
  Response: {{
    "query": {{}},
    "typeOfRequest": "other",
    "message": "I am an AI assistant for the Thinking Poker podcasts. I can help you find episodes, get summaries, or explore episode tags. What would you like to know about the podcasts?"
  }}

10. Query: "What's your favorite color?"
  Response: {{
    "query": {{}},
    "typeOfRequest": "other",
    "message": "I'm focused on helping you find information about the Thinking Poker podcasts. I can help you find specific episodes, get summaries, or explore episode tags. What would you like to know about the podcasts?"
  }}

Now, generate a MongoDB query for the following request:
{query}

Respond in JSON format with exactly this structure:
{{
  "query": [MongoDB query object],
  "typeOfRequest": [string with type of request]
}}
`;

async function generateMongoQuery(query: string): Promise<any> {
	const llm = new ChatOpenAI({
		model: "gpt-4",
		temperature: 0,
	});

	const prompt = ChatPromptTemplate.fromTemplate(MONGO_QUERY_TEMPLATE);
	const outputParser = new JsonOutputParser();
	const llmChain = prompt.pipe(llm).pipe(outputParser);

	return await llmChain.invoke({ query });
}

export async function fetchDocumentsFromVectorStore(
  vectorStore: VectorStore,
  query: string,
  k: number = 100
): Promise<Document[]> {
  const response = await generateMongoQuery(query);

  if (response.typeOfRequest === "other") {
    return [
      new Document({
        pageContent: response.message || "I can help you find information about the Thinking Poker podcasts. What would you like to know?",
        metadata: {}
      })
    ];
  }
  
  let results: Document[] = [];

  const { query: mongoQuery, typeOfRequest } = response;

  console.log(`=== MongoDB Query Debug ===\nOriginal Query: ${query}\nType of Request: ${typeOfRequest}\nGenerated MongoDB Query:\n${JSON.stringify(mongoQuery, null, 2)}\n========================`);

  // Get documents based on the query
  if (Object.keys(mongoQuery).length > 0) {
    results = await vectorStore.similaritySearch(query, k, { 
      preFilter: mongoQuery 
    });
  } else {
    results = await vectorStore.similaritySearch(query, 4);
  }

  // Process the results based on typeOfRequest
  switch (typeOfRequest) {
    case "searchWithTags":
      results = results.map((result, index) => {
        const { metadata } = result;
        return new Document({
          pageContent: `EPISODE_ENTRY_${index + 1}:
Number: ${metadata.episode_number}
Title: ${metadata.episode_name}`,
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
      
      // Add count document
      const countDocument = new Document({
        pageContent: `TOTAL_EPISODES: ${results.length}
!!!IMPORTANT!!! YOU MUST LIST ALL ${results.length} EPISODES IN YOUR RESPONSE
!!!IMPORTANT!!! DO NOT SKIP ANY EPISODES
---`,
        metadata: {}
      });
      
      results.unshift(countDocument);
      break;

    case "summary":
      results = results.map(result => {
        const { metadata } = result;
        return new Document({
          pageContent: result.pageContent,
          metadata: {
            episode_number: metadata.episode_number,
            episode_name: metadata.episode_name,
            episode_tags: metadata.episode_tags || [],
          }
        });
      });
      break;

    case "listOfTags":
      results = [
        new Document({
          pageContent: PRE_DEFINED_TAGS,
          metadata: {}
        })
      ];
      break;

    case "tagsInEpisode":
      results = results.map(result => {
        const { metadata } = result;
        return new Document({
          pageContent: `Tags for Episode ${metadata.episode_number}:\n${metadata.episode_tags?.join('\n')}`,
          metadata: {
            episode_number: metadata.episode_number,
            episode_name: metadata.episode_name,
            episode_tags: metadata.episode_tags || [],
          }
        });
      });
      break;

    default:
      break;
  }

  return results;
}