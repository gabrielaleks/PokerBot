import { getDatabaseConnectionToCollection } from "@/app/utils/database";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required.', status: 400 });
  }

  try {
    const historyCollection = await getDatabaseConnectionToCollection('history');
    const result = await historyCollection.deleteOne({ sessionId: sessionId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: `No history associated to Session ID ${sessionId}` }, { status: 404 });
    }

    return NextResponse.json({
      message: 'History deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ message: 'An error occurred while deleting the history.' }, { status: 400 });
  }
}