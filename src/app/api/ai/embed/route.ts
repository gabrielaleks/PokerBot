import { initializeOpenAIEmbeddings } from '@/app/utils/model'
import { NextResponse } from 'next/server'
import { getDatabaseConnectionToCollection } from '@/app/utils/database';
import { initializeMongoDBVectorStore } from '@/app/utils/vectorStore'
import { generateSplitDocumentsFromFile } from '@/app/utils/textSplitter';
import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { promises as fs, existsSync, mkdirSync, rmSync } from 'fs';
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  const data = request.formData()

  let file: File | null = (await data).get('file') as unknown as File
  if (!file) {
    return NextResponse.json({ message: 'Missing file input', success: false })
  }

  if (file.type == 'audio/wav') {
    file = await generateFileFromWav(file)
  }

  try {
    const splitDocs = await generateSplitDocumentsFromFile(file)
    const embeddings = initializeOpenAIEmbeddings()
    const collection = await getDatabaseConnectionToCollection('embeddings');
    const vectorStore = initializeMongoDBVectorStore(embeddings, collection)
    await vectorStore.addDocuments(splitDocs)
  } catch (error) {
    console.error('Error during embedding:', error);
    return NextResponse.json({ message: 'An error occurred during embedding.' }, { status: 400 });
  }

  return new NextResponse(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

async function generateFileFromWav(wav: File) {
  const uuid = uuidv4()

  const currentDir = dirname(new URL(import.meta.url).pathname);
  const fileResourcesDir = join(currentDir, 'audio', 'resources', uuid)
  const rawAudioDir = join(fileResourcesDir, 'raw_audio');
  const tempFilePath = join(rawAudioDir, wav.name);

  if (!existsSync(rawAudioDir)) {
    mkdirSync(rawAudioDir, { recursive: true });
  }

  try {
    // Save temporary file locally
    const fileBuffer = await wav.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);
    await writeFile(tempFilePath, buffer);

    // Call python script
    const baseAudioFileName = wav.name.split('.')[0]
    await executePythonScript(currentDir, baseAudioFileName, uuid);
    console.log('Python process completed.');

    // Create File from Text file with its path
    const file = await generateFileFromTxt(baseAudioFileName, fileResourcesDir)

    return file;
  } catch (error) {
    console.error('Error generating file:', error);
    throw error;
  } finally {
    cleanup(fileResourcesDir);
  }
}

async function executePythonScript(currentDir: string, baseAudioFileName: string, uuid: string) {
  return new Promise<void>((resolve, reject) => {
    const pythonScript = join(currentDir, 'audio', 'transcription.py');
    const pythonExecutable = join(currentDir, 'audio', 'venv', 'bin', 'python3')
    const pythonProcess = spawn(pythonExecutable, [pythonScript, baseAudioFileName, uuid]);

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(data.toString('utf-8'));
    });
  });
}

async function generateFileFromTxt(baseAudioFileName: string, fileResourcesDir: string) {
  const textFileName = baseAudioFileName + '.txt';
  const transcriptionDir = join(fileResourcesDir, 'transcription', textFileName);
  const textContent = await fs.readFile(transcriptionDir, 'utf-8');
  const options = { type: 'text/plain' };
  const blob = new Blob([textContent], options);
  return new File([blob], textFileName, options);
}

async function cleanup(fileResourcesDir: string) {
  if (existsSync(fileResourcesDir)) {
    rmSync(fileResourcesDir, { force: true, recursive: true })
  } else {
    throw new Error(`Could not find resources folder: ${fileResourcesDir}`)
  }
}