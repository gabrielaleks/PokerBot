import { NextResponse } from 'next/server';
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { FilesManager } from '@/lib/types';

export async function GET() {
  let collectionOfFiles: FilesManager.Files = { files: [] };
  const uniqueFiles = new Set<string>();

  try {
    const collection = await getDatabaseConnectionToCollection('embeddings');
    const cursor = collection.find().stream();

    for await (const result of cursor) {
      const { file_id, episode } = result;
      const key = `${file_id}:${episode}`;

      if (!uniqueFiles.has(key)) {
        uniqueFiles.add(key);
        collectionOfFiles.files.push({ id: file_id, episode });
      }
    }
  } catch (err) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ message: 'An error occurred during fetching of documents.' }, { status: 400 });
  }

  return NextResponse.json({
    files: collectionOfFiles.files
  });
}