import { memo, useEffect, useRef } from 'react'

import Avatar from '../Avatar'
import Message from '../Message'
import { TMessage } from '../Message/Message'
import { Dot } from 'lucide-react'

type Props = {
  messages: TMessage[],
  isLoading: boolean,
  isStreaming: boolean
}
const Chat = ({ messages, isLoading, isStreaming }: Props) => {
  const scrollableContentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (scrollableContentRef.current) {
      scrollableContentRef.current.scrollTop = scrollableContentRef.current.scrollHeight
    }
  }, [messages])

  return (
    <main
      ref={scrollableContentRef}
      className="flex flex-1 flex-col gap-4 overflow-y-scroll bg-zinc-50 p-5 dark:bg-zinc-950"
    >
      {messages.map((message) => (
        <Message key={message.id} sender={message.creator}>
          {message.creator === 'AI' ? <Avatar.Bot /> : null}
          <Message.Balloon
            sender={message.creator}
            message={message.text}
            date={message.createdAt}
          />
          {message.creator === 'USER' ? <Avatar.User /> : null}
        </Message>
      ))}

      {isLoading && !isStreaming ?
        <div className='flex items-center'>
          <Avatar.Bot />
          <Dot size={60} className='animate-ping duration-700' />
        </div>
        : null
      }
    </main>
  )
}

export default memo(Chat)
