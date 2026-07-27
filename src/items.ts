import type { Item } from './types';

// choices[0] is always correct — component shuffles before display.
// difficulty: 1=straightforward, 2=requires inference, 3=subtle/complex

export const ITEMS: Item[] = [

  // ── SOCIAL PROBLEMS ─────────────────────────────────────────────────────────

  {
    id: 's1',
    type: 'social',
    difficulty: 1,
    scenario:
      'Mia is in a group project with two classmates. They vote to do the project on climate change. Mia wanted to do it on space exploration. The two other students start making a plan without asking Mia for her ideas. Mia sits quietly and does not say anything.',
    questions: [
      {
        text: 'What is the problem?',
        stem: 'The problem is that',
        choices: [
          "Mia's ideas were left out and no one asked what she thought",
          "Mia doesn't know anything about climate change",
          'The project is due too soon',
        ],
      },
      {
        text: 'Name 2 things Mia could do.',
        stem: 'One thing Mia could do is',
        choices: [
          'Tell the group she has a different idea and ask if they can hear it',
          'Quit the group and work alone',
          'Pretend she agrees and say nothing',
        ],
      },
    ],
  },

  {
    id: 's2',
    type: 'social',
    difficulty: 2,
    scenario:
      "During a group chat, Dani sends a message asking who wants to work on the science poster together. Two people reply right away, but nobody replies to Dani. The group keeps talking about something else. Dani reads the messages but doesn't say anything else.",
    questions: [
      {
        text: 'What is the problem?',
        stem: 'The problem is that',
        choices: [
          "Dani asked for a partner but was left out of the conversation",
          'Dani sent the message at the wrong time',
          "The other students didn't see the message",
        ],
      },
      {
        text: 'Name 2 things Dani could do.',
        stem: 'One thing Dani could do is',
        choices: [
          'Send another message and ask again directly',
          'Leave the group chat',
          'Tell the teacher everyone is ignoring her',
        ],
      },
    ],
  },

  {
    id: 's3',
    type: 'social',
    difficulty: 1,
    scenario:
      "At lunch, Maya sits down at a table where her friend group is already talking and laughing. Nobody moves to make room or says hi. The conversation keeps going. Maya looks for an empty chair but can't find one nearby.",
    questions: [
      {
        text: 'What is the problem?',
        stem: 'The problem is that',
        choices: [
          "Maya wants to sit with her friends but there isn't space and no one noticed her",
          'Maya came to lunch too late',
          'Maya forgot to bring her lunch',
        ],
      },
      {
        text: 'Name 2 things Maya could do.',
        stem: 'One thing Maya could do is',
        choices: [
          'Say her name and ask if she can pull up a chair',
          'Walk away and eat alone without saying anything',
          'Go sit at a different table with people she does not know',
        ],
      },
    ],
  },

  {
    id: 's4',
    type: 'social',
    difficulty: 2,
    scenario:
      'During PE, teams are picked. Lena is the last person chosen. The team captain sighs and says her name. Lena walks over to the team without saying anything. For the whole game, no one passes the ball to her.',
    questions: [
      {
        text: 'What is the problem?',
        stem: 'The problem is that',
        choices: [
          "Lena feels left out and her team isn't including her in the game",
          "Lena doesn't know how to play the game",
          'The team captain made a mistake',
        ],
      },
      {
        text: 'Name 2 things Lena could do.',
        stem: 'One thing Lena could do is',
        choices: [
          "Speak up and ask her teammates to pass the ball to her",
          'Stop trying and stand at the side',
          'Tell the teacher the game is not fair',
        ],
      },
    ],
  },

  {
    id: 's5',
    type: 'social',
    difficulty: 3,
    scenario:
      "Sam finishes a test early and starts talking to the person next to him. His classmate shakes her head slightly and turns back to her paper. The teacher looks over at Sam but doesn't say anything yet. Sam keeps talking in a quiet voice.",
    questions: [
      {
        text: 'What is the problem?',
        stem: 'The problem is that',
        choices: [
          "Sam is not reading his classmate's signals that she wants to keep working",
          "Sam finished the test too quickly and got the answers wrong",
          'The teacher does not like Sam',
        ],
      },
      {
        text: 'Name 2 things Sam could do.',
        stem: 'One thing Sam could do is',
        choices: [
          'Notice that his classmate is not responding and stop talking',
          'Keep talking because he already finished',
          'Ask the teacher if he can leave early',
        ],
      },
    ],
  },

  // ── NONVERBAL CUES ───────────────────────────────────────────────────────────

  {
    id: 'n1',
    type: 'nonverbal',
    difficulty: 2,
    scenario:
      "At lunch, Priya asks her friend Jess if she wants to sit together. Jess crosses her arms, keeps her eyes on her phone, and says 'sure' in a flat, quiet voice. She doesn't look up.",
    questions: [
      {
        text: 'What does that mean?',
        stem: 'Jess is probably',
        choices: [
          'not really interested but going along with it',
          'excited and happy to sit with Priya',
          'confused about which table to pick',
        ],
      },
    ],
  },

  {
    id: 'n2',
    type: 'nonverbal',
    difficulty: 1,
    scenario:
      "Kai is telling the group his idea for the project. One person in the group keeps looking at her phone. Another person is tapping his pencil on the desk. Nobody asks Kai any questions when he finishes.",
    questions: [
      {
        text: 'What does that mean?',
        stem: "The group members are probably",
        choices: [
          'not paying attention or not very interested',
          'thinking hard about what Kai said',
          'writing notes so they remember the idea',
        ],
      },
    ],
  },

  {
    id: 'n3',
    type: 'nonverbal',
    difficulty: 1,
    scenario:
      "Zoe walks into class and says good morning to her teacher. The teacher smiles, makes eye contact, and says 'Good morning, Zoe! I'm glad you're here.' in a warm voice.",
    questions: [
      {
        text: 'What does that mean?',
        stem: 'The teacher is probably',
        choices: [
          'happy to see Zoe and making her feel welcome',
          'pretending to be nice but actually frustrated',
          'reminding Zoe that she is late',
        ],
      },
    ],
  },

  {
    id: 'n4',
    type: 'nonverbal',
    difficulty: 1,
    scenario:
      "After the teacher says there is a surprise quiz today, Marcus's face drops. He bites his lip, taps his fingers fast on the desk, and stares at his blank notebook.",
    questions: [
      {
        text: 'What does that mean?',
        stem: 'Marcus is probably feeling',
        choices: [
          'nervous or worried about the quiz',
          'excited and ready to show what he knows',
          'bored because quizzes are too easy for him',
        ],
      },
    ],
  },

  {
    id: 'n5',
    type: 'nonverbal',
    difficulty: 3,
    scenario:
      "Two friends are working on a project. One friend suggests a new idea. The other friend pauses, tilts her head to the side, and says 'I guess that could work...' without smiling. Then she immediately suggests a different idea instead.",
    questions: [
      {
        text: 'What does that mean?',
        stem: 'The second friend is probably',
        choices: [
          "not really on board with the idea but is being polite about it",
          'very excited about the idea and thinking how to do it',
          'confused because she did not hear the idea clearly',
        ],
      },
    ],
  },

  // ── TEXT INFERENCES ──────────────────────────────────────────────────────────

  {
    id: 'i1',
    type: 'inference',
    difficulty: 2,
    scenario:
      "Jordan has been on the basketball team for two years. At Monday's practice, Coach Rivera taped the starting lineup to the gym door. Jordan walked past the list three times without looking at it. That night at dinner, Jordan's mom asked how practice went. Jordan said 'fine' and went straight to his room without eating much.",
    questions: [
      {
        text: 'Did Jordan make the starting lineup?',
        stem: 'Jordan probably',
        choices: [
          'did not make the starting lineup',
          'made the lineup and was proud',
          'forgot to check the list',
        ],
      },
    ],
  },

  {
    id: 'i2',
    type: 'inference',
    difficulty: 2,
    scenario:
      "The last time Ava went to the dentist, she cried in the waiting room. Now, when her mom mentions going again, Ava says she has too much homework. She also says her tooth doesn't really hurt anymore, even though she said it hurt a lot yesterday.",
    questions: [
      {
        text: 'Why is Ava saying her tooth feels better now?',
        stem: 'Ava is probably saying her tooth feels better because she',
        choices: [
          'does not want to go back to the dentist',
          'took medicine that fixed the tooth pain',
          'forgot that her tooth hurt yesterday',
        ],
      },
    ],
  },

  {
    id: 'i3',
    type: 'inference',
    difficulty: 1,
    scenario:
      "Nadia studied for the science test every night for a week. She made flashcards and quizzed her sister. On test day, she got to school early and sat in her usual seat. After the test, she walked out of class smiling and immediately texted her mom.",
    questions: [
      {
        text: 'How do you think Nadia did on the test?',
        stem: 'Nadia probably',
        choices: [
          'did well on the test',
          'forgot most of what she studied',
          'did not finish the test in time',
        ],
      },
    ],
  },

  {
    id: 'i4',
    type: 'inference',
    difficulty: 2,
    scenario:
      "Every day at lunch, Tyler sits at the same table near the windows. On Thursday, he walks into the cafeteria and his usual seat is taken by a group of eighth graders. Tyler stands in the middle of the room for a moment, then picks up his tray and walks toward the exit.",
    questions: [
      {
        text: 'How is Tyler feeling?',
        stem: 'Tyler is probably feeling',
        choices: [
          'uncomfortable because his routine changed',
          'happy to try sitting somewhere new',
          'angry at the eighth graders for being rude',
        ],
      },
    ],
  },

  {
    id: 'i5',
    type: 'inference',
    difficulty: 3,
    scenario:
      "Chloe's older sister promised to drive her to the mall on Saturday. On Friday night, the sister gets a call and says she has to work on Saturday. Chloe says 'It's fine' and goes to her room. A few minutes later, her sister hears loud music from behind the closed door.",
    questions: [
      {
        text: 'Is Chloe actually fine with the change in plans?',
        stem: 'Chloe is probably',
        choices: [
          'upset even though she said she was fine',
          'fine with it because she did not really want to go',
          'excited to stay home instead',
        ],
      },
    ],
  },
];
