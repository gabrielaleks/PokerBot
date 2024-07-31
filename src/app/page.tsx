'use client'

import { useCompletion } from 'ai/react'
import { Trash, Bomb, X } from 'lucide-react'
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import Chat from '@/components/Chat'
import { Separator } from '@/components/ui/separator'
import { generateSessionId, getSessionId, saveSessionId, useFile, useMessages } from '@/lib/store'
import Alert from '@mui/material/Alert';
import PurgeHistory from '@/components/PurgeHistory'
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material'
import {
  GPT3_5_OPENAI_MODEL,
  GPT4_OPENAI_MODEL,
  GPT4O_OPENAI_MODEL,
  CLAUDE_3_5_SONNET_MODEL,
  CLAUDE_3_OPUS_MODEL,
  CLAUDE_3_HAIKU_MODEL
} from '@/app/utils/const';

const AI_MODELS = {
  'GPT 3.5': GPT3_5_OPENAI_MODEL,
  'GPT-4': GPT4_OPENAI_MODEL,
  'GPT-4o': GPT4O_OPENAI_MODEL,
  'Claude 3.5 Sonnet': CLAUDE_3_5_SONNET_MODEL,
  'Claude 3 Opus': CLAUDE_3_OPUS_MODEL,
  'Claude 3 Haiku': CLAUDE_3_HAIKU_MODEL
}

async function uploadFile(file: File) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/ai/embed', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorResponse = await response.text()
      throw new Error(`Embedding failed: ${errorResponse}`)
    }
  } catch (error) {
    throw new Error(`Error during embedding: ${error}`)
  }
}

const Home = () => {
  const { messages, setMessages, clearMessages } = useMessages()
  const { clear: clearFile } = useFile()
  const [isUploading, setIsUploading] = useState(false)
  const [filesInserted, setFilesInserted] = useState(false)
  const [purgeAlertOpen, setPurgeAlertOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [modelName, setModelName] = useState('')
  const [showModelAlert, setShowModelAlert] = useState(false);

  const handlePurgeAlertOpen = () => {
    setPurgeAlertOpen(!purgeAlertOpen);
  };

  const handlePurgeComplete = () => {
    setPurgeAlertOpen(false);
    clearMessages();
  };

  const handleModelChange = (event: SelectChangeEvent) => {
    const selectedModel = event.target.value as string;
    setModelName(selectedModel);
  }

  useEffect(() => {
    const storedValue = localStorage.getItem('selectedModel') || '';
    setModelName(storedValue);
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedModel', modelName);
  }, [modelName]);

  const handleFileSelected = async (event?: ChangeEvent<HTMLInputElement>) => {
    if (!event) {
      return clearFile()
    }

    setIsUploading(true)

    const { files } = event.currentTarget

    if (!files?.length) {
      setIsUploading(false)
      return
    }

    try {
      for (var i = 0; i < files.length; i++) {
        await uploadFile(files[i]);
      }

      event.target.value = ''
      setFilesInserted(true)
    } catch (error) {
      throw new Error(`${error}`)
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    let timeoutId: number;
    if (filesInserted) {
      timeoutId = window.setTimeout(() => {
        setFilesInserted(false);
      }, 5000);
    }

    return () => clearTimeout(timeoutId);
  }, [filesInserted]);

  useEffect(() => {
    let sessionId = getSessionId()
    if (!sessionId) {
      sessionId = generateSessionId()
      saveSessionId(sessionId)
    }
    setSessionId(sessionId)
  }, [sessionId])

  const { input, setInput, handleInputChange, handleSubmit, isLoading } = useCompletion({
    api: `/api/ai`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      sessionId: sessionId,
      modelName: modelName
    },
    onResponse: async (res) => {
      if (res.status !== 200) throw new Error(res.statusText);

      const data = res.body;
      if (!data) {
        return;
      }

      let reader;
      try {
        setIsStreaming(true);
        reader = data.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          const chunkValue = decoder.decode(value);
          accumulatedContent += chunkValue;
          setMessages('AI', accumulatedContent);
        }
      } catch (error) {
        console.error('Error reading stream:', error);
        setMessages('AI', 'An error occurred while reading the response. Please try again.');
      } finally {
        setIsStreaming(false);
        if (reader) {
          reader.releaseLock();
        }
      }
    },
    onError: (error) => {
      console.error('Error in useCompletion:', error);
      setMessages('AI', 'An error occurred. Please try again.');
      setIsStreaming(false);
    }
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    if (!modelName) {
      e.preventDefault()
      setShowModelAlert(true)
      return
    }
    if (!input) {
      e.preventDefault()
      return
    }
    Promise.all([handleSubmit(e)])
    setMessages('USER', input)
    setInput('')
  }

  return (
    <div className="z-10 flex h-screen flex-col gap-5 p-5">
      <header className="flex items-center justify-between border-b px-6">
        <h1 className="text-xl font-bold">Chat App</h1>
        {showModelAlert && (<Alert className="relative" severity="info" variant="filled" onClose={() => { setShowModelAlert(false) }}>
          Please choose an AI model before starting the conversation!
        </Alert>)}
        {filesInserted && (<Alert className="relative" severity="success" variant="filled" onClose={() => { setFilesInserted(false) }}>File(s) uploaded!</Alert>
        )}
        <FormControl className='' sx={{ m: 1, minWidth: 120 }}>
          <InputLabel id="select-model-lable" sx={{ color: 'white' }}>AI Model</InputLabel>
          <Select
            labelId="select-model-lable"
            id="model-select"
            label="Model"
            sx={{
              color: 'white',
              'fieldset': {
                borderColor: 'dimgray',
              },
              '& svg': {
                color: 'white',
              },
              '&:hover': {
                '&& fieldset': {
                  borderColor: 'gray',
                }
              }
            }}
            value={modelName}
            onChange={(e) => { handleModelChange(e); setShowModelAlert(false) }}
          >
            {
              Object.entries(AI_MODELS).map(([name, id], i) => (
                (<MenuItem value={id} key={i}>{name}</MenuItem>)
              ))
            }
          </Select>
        </FormControl>
      </header>
      <Chat
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
      />
      <Separator />
      <Chat.Input
        onChange={handleInputChange}
        value={input}
        onSubmit={onSubmit}
        disabled={isLoading}
        onFileSelected={handleFileSelected}
        isUploading={isUploading}
      />
      <div className="flex items-center text-xs gap-5">
        <div
          className="flex cursor-pointer gap-1 text-xs text-red-500 hover:text-red-700"
          onClick={clearMessages}>
          <Trash className="h-4 w-4" /> Clear Chat
        </div>
        <div
          className="flex cursor-pointer gap-1 text-xs text-blue-500 hover:text-blue-700"
          onClick={handlePurgeAlertOpen}>
          <Bomb className="h-4 w-4" /> Purge History
        </div>
      </div>
      {purgeAlertOpen && <PurgeHistory purgeAlertOpen={purgeAlertOpen} setPurgeAlertOpen={setPurgeAlertOpen} onPurgeComplete={handlePurgeComplete} />}
    </div>
  )
}

export default Home
