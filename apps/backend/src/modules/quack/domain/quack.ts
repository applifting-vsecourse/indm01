export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export const POLL_DURATIONS = ['1h', '1d', '1w'] as const;

export type PollDuration = (typeof POLL_DURATIONS)[number];

export type PollAnswer = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  id: string;
  closesAt: Date;
  // Decided by the server's clock when the response is built.
  isClosed: boolean;
  totalVotes: number;
  // The requesting user's vote, if any.
  myAnswerId: string | null;
  // Ordered by position.
  answers: PollAnswer[];
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  poll: Poll | null;
};
