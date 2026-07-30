// Shared between the client (topic-picker UI) and server
// (server/conversationSafety.ts — prompt building + validating the
// topicId a client sends). Plain data only, no JSX — the server's
// tsconfig has no DOM lib, so nothing React-flavored can live here.
//
// This is the *entire* set of topics the partner is allowed to talk
// about. Dropped from the earlier 8-topic list: "Weekend Plans" and
// "Something Funny" — both open-ended in a way that's a bigger
// drift/disclosure surface than the rest.

// Short, plain phrase describing each topic to the model — not the full
// system prompt, just the subject-matter fragment.
export const CONVERSATION_TOPICS = [
  { id: 'shows',  label: 'Shows & Movies', description: 'What are you watching?',    promptFragment: 'a show or movie you both might have seen or want to watch' },
  { id: 'sports', label: 'Sports',         description: 'Teams, players, games',     promptFragment: 'sports — teams, playing, watching games, PE class' },
  { id: 'music',  label: 'Music',          description: 'Songs, artists, playlists', promptFragment: 'music — favorite songs, artists, concerts, playlists' },
  { id: 'games',  label: 'Games',          description: 'Video games, board games',  promptFragment: 'video games or board games you play' },
  { id: 'school', label: 'School',         description: 'Classes, teachers, stuff',  promptFragment: 'school — interesting classes, teachers, projects, lunch' },
  { id: 'pets',   label: 'Pets',           description: 'Animals, pets you have',    promptFragment: 'pets or animals — pets you have, want, or just think are cool' },
  { id: 'food',   label: 'Food',           description: 'Favorites, restaurants',    promptFragment: 'food — favorite foods, restaurants, cooking, school lunch' },
] as const;

export type ConversationTopic = (typeof CONVERSATION_TOPICS)[number];
export type ConversationTopicId = ConversationTopic['id'];

export function conversationTopicById(id: string) {
  return CONVERSATION_TOPICS.find(t => t.id === id);
}

export function isValidConversationTopicId(id: string): id is ConversationTopicId {
  return CONVERSATION_TOPICS.some(t => t.id === id);
}
