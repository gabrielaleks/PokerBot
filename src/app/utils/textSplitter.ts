import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { ObjectId } from "mongodb";

export async function generateSplitDocumentsFromFile(file: File) {
    const splitDocs = await processPokerFile(file);
    return splitDocs;
}

async function processPokerFile(file: File): Promise<Document[]> {
    const loader = new TextLoader(file);
    const docs = await loader.load();

    const fileContent = docs[0].pageContent;
    const fileId = new ObjectId().toString();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 300,
        separators: ["\n\n", "\n"]
    });

    const splitDocs = await textSplitter.createDocuments(
        [fileContent],
        [
            {
                'episode': file.name,
                'file_id': fileId
            }
        ],
        {
            chunkHeader: `EPISODE NAME: ${file.name}\n\n`,
            appendChunkOverlapHeader: true
        }
    );

    return splitDocs;

}