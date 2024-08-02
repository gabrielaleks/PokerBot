import { NextResponse } from 'next/server';
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { FilesManager } from '@/lib/types';

export async function GET() {
  try {
    const collection = await getDatabaseConnectionToCollection('embeddings');

    const result = await collection.aggregate<FilesManager.File>([
      {
        $group: {
          _id: { file_id: "$file_id", episode_name: "$episode_name" },
        }
      },
      {
        $project: {
          _id: 0,
          id: "$_id.file_id",
          episode: "$_id.episode_name"
        }
      },
      {
        $addFields: {
          objectId: { $toObjectId: "$id" }
        }
      },
      {
        $sort: { objectId: 1 }
      },
      {
        $project: {
          id: 1,
          episode: 1
        }
      }
    ]).toArray();

    const collectionOfFiles: FilesManager.Files = { 
      files: result
    };

    return NextResponse.json(collectionOfFiles);
  } catch (err) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ message: 'An error occurred during fetching of documents.' }, { status: 500 });
  }
}