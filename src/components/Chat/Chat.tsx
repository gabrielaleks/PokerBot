import { memo, useEffect, useRef, useState } from 'react'

import Avatar from '../Avatar'
import Message from '../Message'
import { TMessage } from '../Message/Message'
import { Dot, ClipboardCopy, Check } from 'lucide-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Tooltip from '@mui/material/Tooltip';

type Props = {
	messages: TMessage[],
	isLoading: boolean,
	isStreaming: boolean
}
const Chat = ({ messages, isLoading, isStreaming }: Props) => {
	const scrollableContentRef = useRef<HTMLElement>(null)
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

	const handleCopy = (messageId: string) => {
		setCopiedMessageId(messageId);
		setTimeout(() => setCopiedMessageId(null), 2000);
	};

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
				<div className="message-row my-5 group" key={message.id}>
					<Message key={message.id} sender={message.creator}>
						{message.creator === 'AI' ? <Avatar.Bot /> : null}
						<div className="relative">
							<Message.Balloon
								sender={message.creator}
								message={message.text}
								date={message.createdAt}
							/>
							{message.creator === 'AI' && (
								<div className="message-options absolute -bottom-8 left-0.5 bg-slate-700 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<CopyToClipboard text={message.text} onCopy={() => handleCopy(message.id)}>
										{copiedMessageId === message.id ? (
											<Check
												size={20}
											/>
										) : (
											<Tooltip title="Copy" placement="bottom">
												<ClipboardCopy
													size={20}
													className="cursor-pointer hover:scale-110 transition duration-200"
												/>
											</Tooltip>
										)}
									</CopyToClipboard>
								</div>
							)}
						</div>
						{message.creator !== 'AI' && <Avatar.User />}
					</Message>
				</div>
			))}


			{isLoading && !isStreaming ? (
				<div className="flex items-center">
					<Avatar.Bot />
					<Dot size={60} className="animate-ping duration-700" />
				</div>
			) : null}
		</main>
	)

}

export default memo(Chat)
