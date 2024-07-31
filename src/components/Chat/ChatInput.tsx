import {Send, Loader} from 'lucide-react'
import {ChangeEvent, useRef} from 'react'

import {cn} from '@/lib/utils'

import FileUpload from '../FileUpload'
import FilesManager from '../FilesManager'
import {Button} from '../ui/button'
import {Textarea} from '../ui/textarea'

type Props = {
  onFileSelected?: (event?: ChangeEvent<HTMLInputElement>) => void
  onChange: (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => void
  value: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  disabled?: boolean
  isUploading?: boolean
}

const ChatInput = ({
  onFileSelected,
  onChange,
  value,
  onSubmit,
  disabled,
  isUploading,
}: Props) => {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="flex flex-row items-center gap-5">
        <div className="flex flex-1 items-center gap-3">
          <Textarea
            className="flex max-h-[14rem] min-h-[2.5rem] flex-1"
            placeholder="Type your message"
            value={value}
            autoFocus
            rows={value.split(`\n`)?.length || 1}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()

                if (e.shiftKey) onChange({target: {value: `${value}\n`}} as any)
                else formRef.current?.requestSubmit()

                return
              }
            }}
          />
          {isUploading ? (
            <Loader className="animate-spin h-5 w-5 text-neutral-500" />
          ) : (
            <FileUpload id="file" onChange={onFileSelected} />
          )}
          <FilesManager id="manager" />
        </div>
        <Button
          className={cn('gap-2', disabled && 'bg-neutral-300')}
          type="submit"
          disabled={!value || disabled || isUploading}>
          Send <Send className="h-3 w-3" />
        </Button>
      </div>
    </form>
  )
}

export default ChatInput
