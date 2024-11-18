import { initializeOpenAIEmbeddings } from '@/app/utils/model'
import { NextResponse } from 'next/server'
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { initializeMongoDBVectorStore } from '@/app/utils/vectorStore'
import { generateDocumentsFromFile } from '@/app/utils/textSplitter';

export async function POST(request: Request) {
  const data = request.formData()

  let file: File | null = (await data).get('file') as unknown as File
  if (!file) {
    return NextResponse.json({ message: 'Missing file input', success: false })
  }

  try {
    const docs = await generateDocumentsFromFile(file)
    const embeddings = initializeOpenAIEmbeddings()
    const collection = await getDatabaseConnectionToCollection('embeddings');
    const vectorStore = initializeMongoDBVectorStore(embeddings, collection)
    await vectorStore.addDocuments(docs)
  } catch (error) {
    console.error('Error during embedding:', error);
    return NextResponse.json({ message: 'An error occurred during embedding.' }, { status: 400 });
  }

  return new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}