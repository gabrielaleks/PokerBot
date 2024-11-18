import { TextLoader } from "langchain/document_loaders/fs/text";
import { Document } from '@langchain/core/documents';
import { ObjectId } from "mongodb";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PRE_DEFINED_TAGS, SUMMARY_EXAMPLE } from "./const";

interface EpisodeInformation {
    summary: string;
    tags: string[];
}

export async function generateDocumentsFromFile(file: File): Promise<Document<Record<string, any>>[]> {
    const docs = await processPokerFile(file);
    return [docs];
}

async function processPokerFile(file: File): Promise<Document> {
    const loader = new TextLoader(file);
    const docs = await loader.load();

    const fileContent = docs[0].pageContent;
    const fileId = new ObjectId().toString();

    const episodeNumberMatch = file.name.match(/E(\d+)/);
    const episodeNumber = episodeNumberMatch ? episodeNumberMatch[1] : "unknown";

    const episodeInformation = await extractEpisodeInformation(fileContent, file.name);
    const summary = episodeInformation.summary;
    const tags = episodeInformation.tags;

    return new Document({
        pageContent: summary,
        metadata: {
            episode_number: parseInt(episodeNumber),
            episode_name: file.name,
            file_id: fileId,
            episode_tags: tags
        }
    });
}

async function extractEpisodeInformation(pokerEpisode: string, episodeName: string): Promise<EpisodeInformation> {
    const llm = new ChatOpenAI({
        model: "gpt-4o",
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0,
    });
    const template = `You are an AI language model specialized in extracting information from text.
    You will be provided with the transcripted text of a Thinking Poker Daily episode.
    With that in hand, you have two tasks:
    1. Summarize the episode.
    2. Extract pre-defined tags from the episode.

    **Rules to follow**
    1. When summarizing an episode, present your entire response in bullet points. For example:

    ${SUMMARY_EXAMPLE}

    BE AWARE: this is only a template. You should use the actual episode's content and name when summarizing it.
    This is the name of the current episode: {episodeName}

    2. The tags you extract from the text NEED to be from this list:

    ${PRE_DEFINED_TAGS}
    
    Respond in JSON format following this template:
    {{
        "summary": "<summary of the provided episode>",
        "tags": ["<tag1>", "<tag2>", "<tag3>"]
    }}

    Here's the text you need to extract information from:
    {pokerEpisode}
    `;

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const outputParser = new JsonOutputParser();
    const llmChain = prompt.pipe(llm).pipe(outputParser);
    const response = await llmChain.invoke({ pokerEpisode, episodeName });
    const episodeInformation: EpisodeInformation = {
        summary: response.summary,
        tags: response.tags.map((tag: string) => tag.toLowerCase()),
    };

    return episodeInformation;
}