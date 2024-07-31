import { NextRequest, NextResponse } from "next/server";
import { getDatabaseConnectionToCollection } from '@/app/utils/database';

export async function DELETE(req: NextRequest, { params }: { params: { fileId: string } }) {
  const fileId = params.fileId

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required.', status: 400 });
  }

  try {
    const collection = await getDatabaseConnectionToCollection('embeddings');
    const result = await collection.deleteMany({ 'file_id': fileId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: `No file with given id: ${fileId}` }, { status: 404 });
    }

    return NextResponse.json({
      message: 'File deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ message: 'An error occurred while deleting the file.' }, { status: 400 });
  }
}
