import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Collection } from 'mongodb';

export function initializeMongoDBVectorStore(
  embeddings: OpenAIEmbeddings,
  collection: Collection
) {
  return new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: "default",
    textKey: "text",
    embeddingKey: "embedding"
  });
}