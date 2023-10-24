import { FinishedAnswerObjectParsingTypes } from '../components/Question'
import { Prompt } from './openAI'

const _handleFollowupQuestionsIdMatching = `When annotating a new entity that was not mentioned in the previous response, \
please make sure that they are annotated with a new entity id \
(for example, if the previous annotation has reached id "$N102", then the new annotation id should start at "$N103"). \
However, if the same entity has appeared in the original response, please match their id.`

/* -------------------------------------------------------------------------- */
/* --------------------------- prompts start here --------------------------- */
/* -------------------------------------------------------------------------- */

/*
old:
The paragraphs should cover the most important aspects of the answer, with each of them discussing one aspect or topic. \

new:
The paragraphs should cover all knowledge you know to answer in a comprehensive and informative way, even if they are open ended, challenging, or strange. \
*/

/*
Please provide a well-structured response to the user's question in multiple paragraphs. \
The paragraphs should cover all the knowledge you know in order to answer in a comprehensive and informative way, even if they are open-ended, challenging or strange. \ 
Each paragraph should have fewer than 5 sentences, and your response should have fewer than 8 paragraphs in total. \
The user’s goal is to construct a concept map to visually explain your response. \
*/

export const predefinedPrompts = {
  initialAsk: (question: string): Prompt[] => {
    const filteredQuestion = question
      .split('\n') // diviser en lignes
      .filter(line => line.length >= 200) // filtrer les lignes de moins de 200 caractères
      .join('\n') // regrouper les lignes

    return [
      {
        role: 'system',
        content: `Analyse the user's text composed of multiple paragraphs. \
The user’s goal is to construct a concept map to visually explain the user's text. \
To achieve this, annotate the key entities and relationships inline for each sentence in the paragraphs. \
\
Every entity is tagged as [entity ($N1)], for instance, [Artificial Intelligence ($N1)]. \
Do not annotate conjunctive adverbs, such as "since then" or "therefore", as entities in the map. \
\
Relationships should solely express the semantic linkage between entities. \
\
Utilize the format [relationship ($H, $N1, $N2)] to detail these connections, like [AI ($N1)] [is a field of ($H, $N1, $N2)] [computer science ($N2)]. \
\
Focus on capturing the direct semantic connections between entities. \
\
Examples: \
\
Example A: \
[Artificial Intelligence (AI) ($N1)] [is a field of ($H, $N1, $N2)] [computer science ($N2)]. \
[AI ($N1)] [comprises types like ($H, $N1, $N9; $H, $N1, $N10)] [narrow AI ($N9)] and [general AI ($N10)]. \
[Narrow AI ($N9)] [is designed for ($H, $N9, $N11)] [specific tasks ($N11)], whereas [general AI ($N10)] [aims to mimic ($H, $N10, $N12)] [human intelligence ($N12)]. \
\
Example B: \
[Human-Computer Interaction (HCI) ($N1)] [is a ($H, $N1, $N2)] [multidisciplinary field ($N2)] that [concentrates on ($H, $N1, $N3)] [the design and use of computer technology ($N3)], especially concerning [interfaces ($N4)] [between ($H, $N4, $N5; $H, $N4, $N6)] [people (users) ($N5)] and [computers ($N6)]. \
\
Example C: \
[Birds ($N1)] [can ($H, $N1, $N2)] [fly ($N2)] because of [adaptations like ($H, $N3, $N4; $H, $N3, $N8)] [lightweight bones ($N4)] and [wing structure ($N8)] that are specifically [designed for ($H, $N4, $N2; $H, $N8, $N2)] [flight ($N2)]. \
\
Your response should have multiple paragraphs.`,
      },
      {
        role: 'user',
        content: filteredQuestion,
      },
    ]
  },
  nodeExpand: (
    prevConversation: Prompt[],
    originalSentence: string,
    nodeLabel: string,
  ): Prompt[] => {
    return [
      ...prevConversation,
      {
        role: 'user',
        content: `In the sentence "${originalSentence}", you mentioned the entity "${nodeLabel}". \
Can you explain this entity in 1 to 2 sentences? \
Please refer to the original response as the context of your explanation. \
Your explanation should be concise, one paragraph, and follow the same annotation format as the original response. \
You should try to annotate at least one relationship for each entity. Relationships should only connect entities that appear in the response. \
${_handleFollowupQuestionsIdMatching}

For example, for "[general AI ($N10)]" in the sentence \
"[AI systems ($N1)] can be [divided into ($H, $N1, $N9; $H, $N1, $N10)] [narrow AI ($N9)] and [general AI ($N10)].":
[General AI ($N10)] refers to a [type of ($L, $N1, $N10)] [artificial intelligence ($N1)] that \
[has the ability to ($L, $N10, $N14; $L, $N10, $N5; $L, $N10, $N15)] [understand ($N14)], [learn ($N5)], \
and [apply knowledge across a wide range of tasks ($N15)].`,
      },
    ]
  },
  nodeExamples: (
    prevConversation: Prompt[],
    originalSentence: string,
    nodeLabel: string,
  ): Prompt[] => {
    return [
      ...prevConversation,
      {
        role: 'user',
        content: `In the sentence "${originalSentence}", you mentioned the entity "${nodeLabel}". \
Can you give a few examples of it? \
Your response should follow the same annotation format as the original response, as shown in the following example. \
${_handleFollowupQuestionsIdMatching} \
You don't need to further explain the examples you give.

For example, for "[Fruits ($N1)]" in the sentence \
"[Fruits ($N1)] can [help with ($H, $N1, $N2)] [health ($N2)].", your response could be: \
"[Fruits ($N1)], for example, [includes ($H, $N1, $N3; $H, $N1, $N4; $H, $N1, $N5)], \
[apples ($N3)], [oranges ($N4)], and [watermelons ($N5)]."`,
      },
    ]
  },
  _2MoreSentences: (
    prevConversation: Prompt[],
    originText: string,
  ): Prompt[] => {
    return [
      ...prevConversation,
      {
        role: 'user',
        content: `For the paragraph "${originText}", \
can you continue writing one or two more sentences at the end of the paragraph? \
When continue writing this paragraph, please refer to the original response as the context of your writing. \
Your response should be about the same topic and aspect of the original paragraph and could add more details. \
Your response should follow the same annotation format as the original response.
${_handleFollowupQuestionsIdMatching} \
Your response should only have the new content.`,
      },
    ]
  },
  _1MoreParagraph: (prevConversation: Prompt[]): Prompt[] => {
    return [
      ...prevConversation,
      {
        role: 'user',
        content: `Can you continue writing one paragraph after the end of your original response? \
When writing the new paragraph, please refer to the original response as the context of your writing. \
Your response should still try to answer the user's original question and could add more details or provide a new aspect. \
Your response should follow the same annotation format as the original response.
${_handleFollowupQuestionsIdMatching} \
Your response should only have the new content.`,
      },
    ]
  },
  selfCorrectionBySentence: (
    prevConversation: Prompt[],
    originalSentence: string,
    orphanNodes: string[],
    noWhereEdges: string[],
  ): Prompt[] => {
    const hasOrphan = orphanNodes.length > 0
    const hasNoWhere = noWhereEdges.length > 0

    return [
      ...prevConversation,
      {
        role: 'system',
        content: `In the following sentence of your original response, there are some issues that need to be fixed.

${
  hasOrphan
    ? `The entities "${orphanNodes.join(
        ', ',
      )}" were mentioned but not connected by any relationships.`
    : ''
}
${
  hasNoWhere
    ? `One or more relationships annotated by relationship annotations "${noWhereEdges.join(
        ', ',
      )}" \
were trying to connect entities with ids that are not mentioned in the response.`
    : ''
}

In your corrected response, please make sure that all entities and relationships are extracted correctly. \
Relationships should only connect existing entities, and entities should be connected by at least one relationship. \
Please try to fix these issues in your response by annotating the same sentence again. \
You may arrange the sentences in a way that facilitates the annotation of entities and relationships, \
but the arrangement should not alter their meaning and they should still flow naturally in language. \
\
${_handleFollowupQuestionsIdMatching} \
\
Please only include the re-annotated sentence in your response.`,
      },
      {
        role: 'user',
        content: `Please re-annotate this sentence: ${originalSentence.trimStart()}`,
      },
    ]
  },
  summarizeParagraph: (paragraph: string): Prompt[] => {
    return [
      {
        role: 'system',
        content: `You are a professional writer specializing in text summarization. Make a short, one-sentence summary of the chunk of the text provided by the user. \
The summary should reflect the main idea and the most important relationships of the text.
Notice that the user has annotated the text with entities and relationships. \
Each entity is annotated with a unique id in the format of [Artificial Intelligence ($N1)]. \
Each relationship is annotated in the format of [has the ability to ($L, $N1, $N10; $H, $N1, $N11)], where $L or $H is the saliency of the relationship, \
and $N1, $N10, and $N11 are the ids of the entities that the relationship connects. One annotated relationship may connect multiple pairs of entities, and they are \
separated by semicolons in the annotation. \
\
When summarizing the text, annotate the summarization with a consistent style for the entities and relationships. \
Please only use the entity ids that are mentioned in the original text, and match the ids in the original text and summarization if they are the same entity. \
Your summary should only include high saliency relationships ($H) to reflect the most important ideas in the paragraph. \
\
You can arrange the sentences in the summarization in a way that facilitates the annotation of entities and relationships, \
but the arrangement should not alter their meaning and they should still flow naturally in language. \
\
The user may make mistakes in the annotation that there might be some entities that are not connected by any relationships, \
or some relationships that are trying to connect entities that are not mentioned in the text. Please avoid these mistakes when \
annotating the summary. Your summary should have only one short sentence.

Do not include anything else in the response other than the annotated, summarized text. For example, for paragraph:

[Human-Computer Interaction ($N1)] [is a ($H, $N1, $N2)] [multidisciplinary field ($N2)] that [focuses on ($H, $N1, $N3)] [the design and use of computer technology ($N3)], \
[centered around ($H, $N1, $N4)] [the interfaces ($N4)] [between ($H, $N4, $N5; $H, $N4, $N6)] [people (users) ($N5)] and [computers ($N6)]. \
[Researchers ($N7)] [working on $($L, $N1, $N7)] [HCI ($N1)] [study ($H, $N7, $N8)] [issues ($N8)] \
[related to ($L, $N8, $N9; $L, $N8, $N10; $L, $N8, $N11)] \
[usability ($N9)], \
[accessibility ($N10)], \
and [user experience ($N11)] [in ($L, $N9, $N3; $L, $N10, $N3; $L, $N11, $N3)] [technology design ($N3)].

You may summarize it as:

[HCI ($N1)] [is a ($H, $N1, $N2)] [multidisciplinary field ($N2)] that [centered around ($H, $N1, $N4)] \
[the interfaces ($N4)] [between ($H, $N4, $N5; $H, $N4, $N6)] [users ($N5)] and [computers ($N6)].`,
      },
      {
        role: 'user',
        content: paragraph,
      },
    ]
  },
  getSlideMarkdown: (partResponse: string): Prompt[] => {
    return [
      {
        role: 'system',
        content: `You are a professional presentation slide builder. Structure the following text provided by the user into a presentation slide, in markdown format. \
If you need to use a list, use a numbered list. \
Do not include anything else in the response other than the markdown text.`,
      },
      {
        role: 'user',
        content: partResponse,
      },
    ]
  },
  /* -------------------------------------------------------------------------- */
  _deprecated_parseRelationships: (
    partResponse: string,
    target: 'text' | 'sentence' = 'text',
  ): Prompt[] => {
    // ! deprecated
    return [
      {
        role: 'system',
        content: `You are a helpful, creative, and clever assistant. \
Break down the following ${target} into a knowledge graph. \
Use singular nouns and lowercase letters for node labels when possible and correct (e.g., the meaning of the label doesn't change). \
Each node can be used in multiple relationships. There should be one connected graph in total.

Response format: {subject} - \
{short label indicating the relationship between subject and object} \
- {object} \
= {exact quote as a substring of the original ${target} that the relationship is derived from, can either be a sentence or phrase}.

Divide the relationships by line breaks.`,
      },
      {
        role: 'user',
        content: partResponse,
      },
    ]
  },
}

export const predefinedPromptsForParsing: {
  [key in FinishedAnswerObjectParsingTypes]: (text: string) => Prompt[]
} = {
  summary: predefinedPrompts.summarizeParagraph,
  slide: predefinedPrompts.getSlideMarkdown,
}
