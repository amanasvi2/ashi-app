import type { Item } from './types';

// Offline practice: one question, grounded evidence, and help for all four levels.
// choices[0] is the example answer; the display shuffles choices.
// Editorially revised, not clinically validated.
export const ITEMS: Item[] = [
  {
    "id": "s1",
    "type": "social",
    "difficulty": 1,
    "scenario": "Two friends are making a poster. Both need the scissors at the same time. There is only one pair.",
    "questions": [
      {
        "text": "What is the problem?",
        "stem": "The problem is",
        "choices": [
          "both friends need the same scissors",
          "the scissors have gone missing",
          "the poster is already finished"
        ],
        "evidence": "Both need the scissors at the same time.",
        "wordBank": [
          {
            "text": "both friends need the same scissors",
            "correct": true
          },
          {
            "text": "the scissors have gone missing",
            "correct": false
          },
          {
            "text": "the poster is already finished",
            "correct": false
          },
          {
            "text": "the glue is missing",
            "correct": false
          },
          {
            "text": "the table is empty",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "s2",
    "type": "social",
    "difficulty": 2,
    "scenario": "Dani sends a group message about a project. A classmate replies, “Are you asking for a partner or sharing your plan?” Dani has not explained which one.",
    "questions": [
      {
        "text": "What needs to be clearer?",
        "stem": "The group needs to know",
        "choices": [
          "what Dani is asking for",
          "whether the project is finished",
          "where Dani lost the poster"
        ],
        "evidence": "A classmate replies, “Are you asking for a partner or sharing your plan?”",
        "wordBank": [
          {
            "text": "what Dani is asking for",
            "correct": true
          },
          {
            "text": "whether the project is finished",
            "correct": false
          },
          {
            "text": "where Dani lost the poster",
            "correct": false
          },
          {
            "text": "when the room was painted",
            "correct": false
          },
          {
            "text": "who owns the table",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "s3",
    "type": "social",
    "difficulty": 1,
    "scenario": "A classmate walks up to a game. The classmate asks to join. No one answers, and the classmate waits beside an empty chair.",
    "questions": [
      {
        "text": "What is the problem?",
        "stem": "The problem is",
        "choices": [
          "the classmate is waiting for an answer",
          "there is no chair near the game",
          "the classmate asked to end the game"
        ],
        "evidence": "No one answers, and the classmate waits beside an empty chair.",
        "wordBank": [
          {
            "text": "the classmate is waiting for an answer",
            "correct": true
          },
          {
            "text": "there is no chair near the game",
            "correct": false
          },
          {
            "text": "the classmate asked to end the game",
            "correct": false
          },
          {
            "text": "the game has no pieces",
            "correct": false
          },
          {
            "text": "the room has no table",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "s4",
    "type": "social",
    "difficulty": 2,
    "scenario": "During a team game, Lena asks for a turn with the ball. Her teammate says, “Only I get to use it,” and keeps the ball. The game is meant for the whole team.",
    "questions": [
      {
        "text": "What is the problem?",
        "stem": "The problem is",
        "choices": [
          "one teammate is keeping all the turns",
          "Lena has not asked for a turn",
          "the whole team has finished playing"
        ],
        "evidence": "Her teammate says, “Only I get to use it,” and keeps the ball.",
        "wordBank": [
          {
            "text": "one teammate is keeping all the turns",
            "correct": true
          },
          {
            "text": "Lena has not asked for a turn",
            "correct": false
          },
          {
            "text": "the whole team has finished playing",
            "correct": false
          },
          {
            "text": "the ball is missing",
            "correct": false
          },
          {
            "text": "the game has no teams",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "s5",
    "type": "social",
    "difficulty": 3,
    "scenario": "Sam finishes work while a classmate is still taking a test. Sam asks a question. The classmate says, “Please wait until I finish.” Sam asks two more questions before the classmate finishes.",
    "questions": [
      {
        "text": "Which need has not been respected?",
        "stem": "The classmate asked for",
        "choices": [
          "time to finish before talking",
          "more questions during the test",
          "help choosing a new game"
        ],
        "evidence": "The classmate says, “Please wait until I finish.”",
        "wordBank": [
          {
            "text": "time to finish before talking",
            "correct": true
          },
          {
            "text": "more questions during the test",
            "correct": false
          },
          {
            "text": "help choosing a new game",
            "correct": false
          },
          {
            "text": "a different table color",
            "correct": false
          },
          {
            "text": "a longer conversation now",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "n1",
    "type": "nonverbal",
    "difficulty": 2,
    "scenario": "A friend puts down the game and speaks softly. The friend says, “I need a quiet minute.” You are not sure whether the friend wants to stop or play later.",
    "questions": [
      {
        "text": "What could you ask to check?",
        "stem": "You could ask",
        "choices": [
          "would you like to stop or play later",
          "why are you angry with everyone",
          "why do you hate this game"
        ],
        "evidence": "The friend says, “I need a quiet minute.”",
        "wordBank": [
          {
            "text": "would you like to stop or play later",
            "correct": true
          },
          {
            "text": "why are you angry with everyone",
            "correct": false
          },
          {
            "text": "why do you hate this game",
            "correct": false
          },
          {
            "text": "why did you lose the game",
            "correct": false
          },
          {
            "text": "why are you hiding the game",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "n2",
    "type": "nonverbal",
    "difficulty": 1,
    "scenario": "Kai taps a pencil during group work. Kai says, “Tapping helps me think,” and explains the plan clearly. A classmate thinks tapping always means someone is not listening.",
    "questions": [
      {
        "text": "What does this example show?",
        "stem": "Tapping a pencil",
        "choices": [
          "does not always mean someone is not listening",
          "always means someone wants to leave",
          "proves someone dislikes the group"
        ],
        "evidence": "Kai says, “Tapping helps me think,” and explains the plan clearly.",
        "wordBank": [
          {
            "text": "does not always mean someone is not listening",
            "correct": true
          },
          {
            "text": "always means someone wants to leave",
            "correct": false
          },
          {
            "text": "proves someone dislikes the group",
            "correct": false
          },
          {
            "text": "means the plan is finished",
            "correct": false
          },
          {
            "text": "means the work is missing",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "n3",
    "type": "nonverbal",
    "difficulty": 1,
    "scenario": "Zoe arrives at an activity. The leader smiles and says, “Welcome, Zoe. I saved you a place.” The leader points to an empty seat.",
    "questions": [
      {
        "text": "What do the words and gesture suggest?",
        "stem": "The leader is",
        "choices": [
          "welcoming Zoe to the activity",
          "asking Zoe to leave the activity",
          "saying there are no seats left"
        ],
        "evidence": "The leader smiles and says, “Welcome, Zoe. I saved you a place.”",
        "wordBank": [
          {
            "text": "welcoming Zoe to the activity",
            "correct": true
          },
          {
            "text": "asking Zoe to leave the activity",
            "correct": false
          },
          {
            "text": "saying there are no seats left",
            "correct": false
          },
          {
            "text": "saying the activity has ended",
            "correct": false
          },
          {
            "text": "asking Zoe to hide a chair",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "n4",
    "type": "nonverbal",
    "difficulty": 2,
    "scenario": "Marcus is about to share a story with the group. His hands shake a little. He says, “I hope I remember what to say.”",
    "questions": [
      {
        "text": "How might Marcus be feeling?",
        "stem": "Marcus might feel",
        "choices": [
          "worried about sharing his story",
          "certain he has nothing to say",
          "angry that the story has ended"
        ],
        "evidence": "He says, “I hope I remember what to say.”",
        "wordBank": [
          {
            "text": "worried about sharing his story",
            "correct": true
          },
          {
            "text": "certain he has nothing to say",
            "correct": false
          },
          {
            "text": "angry that the story has ended",
            "correct": false
          },
          {
            "text": "ready to leave a finished activity",
            "correct": false
          },
          {
            "text": "upset about a missing ball",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "n5",
    "type": "nonverbal",
    "difficulty": 3,
    "scenario": "A friend pauses after hearing a plan. The friend says, “Part of that could work, but I am not sure we have enough time.” The friend suggests a shorter plan.",
    "questions": [
      {
        "text": "What is one reason for the new suggestion?",
        "stem": "The friend may be",
        "choices": [
          "trying to fit the plan into the time",
          "rejecting every part of the first plan",
          "saying there is no time limit"
        ],
        "evidence": "The friend says, “Part of that could work, but I am not sure we have enough time.”",
        "wordBank": [
          {
            "text": "trying to fit the plan into the time",
            "correct": true
          },
          {
            "text": "rejecting every part of the first plan",
            "correct": false
          },
          {
            "text": "saying there is no time limit",
            "correct": false
          },
          {
            "text": "asking to make the plan longer",
            "correct": false
          },
          {
            "text": "saying the plan is already finished",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "i1",
    "type": "inference",
    "difficulty": 2,
    "scenario": "Jordan wants a place in a small music group. The leader has filled every place and asks Jordan to try again next month. Jordan puts the practice sheet away.",
    "questions": [
      {
        "text": "What can you work out from the leader’s reply?",
        "stem": "Jordan",
        "choices": [
          "does not have a place in the group yet",
          "has been chosen to lead the group",
          "has a place in the group today"
        ],
        "evidence": "The leader has filled every place and asks Jordan to try again next month.",
        "wordBank": [
          {
            "text": "does not have a place in the group yet",
            "correct": true
          },
          {
            "text": "has been chosen to lead the group",
            "correct": false
          },
          {
            "text": "has a place in the group today",
            "correct": false
          },
          {
            "text": "has never practiced music",
            "correct": false
          },
          {
            "text": "has decided never to try again",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "i2",
    "type": "inference",
    "difficulty": 1,
    "scenario": "The library closes at four. It is nearly four now. A friend still wants to choose a book before the doors close.",
    "questions": [
      {
        "text": "What will the friend need to do?",
        "stem": "The friend needs to",
        "choices": [
          "choose a book soon",
          "wait until after the doors close",
          "return a book that was never borrowed"
        ],
        "evidence": "It is nearly four now.",
        "wordBank": [
          {
            "text": "choose a book soon",
            "correct": true
          },
          {
            "text": "wait until after the doors close",
            "correct": false
          },
          {
            "text": "return a book that was never borrowed",
            "correct": false
          },
          {
            "text": "ask why the library has no books",
            "correct": false
          },
          {
            "text": "wait until next week in the library",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "i3",
    "type": "inference",
    "difficulty": 1,
    "scenario": "Nadia brings a drawing to the group. The leader says, “I can see you tried the shading we practiced.” Nadia points to the darker parts she added.",
    "questions": [
      {
        "text": "What did Nadia use in her drawing?",
        "stem": "Nadia used",
        "choices": [
          "something the group practiced earlier",
          "a skill the group has never discussed",
          "a drawing that someone else made"
        ],
        "evidence": "The leader says, “I can see you tried the shading we practiced.”",
        "wordBank": [
          {
            "text": "something the group practiced earlier",
            "correct": true
          },
          {
            "text": "a skill the group has never discussed",
            "correct": false
          },
          {
            "text": "a drawing that someone else made",
            "correct": false
          },
          {
            "text": "a drawing with no darker parts",
            "correct": false
          },
          {
            "text": "a page that is still empty",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "i4",
    "type": "inference",
    "difficulty": 2,
    "scenario": "The lunch room is crowded and noisy. Tyler tells a friend, “I want somewhere quieter where I can still eat with you.” There is space in a quiet area nearby.",
    "questions": [
      {
        "text": "Which plan fits what Tyler said?",
        "stem": "They could",
        "choices": [
          "eat together in the quieter area",
          "stay in the noise without discussing it",
          "decide Tyler wants to be alone"
        ],
        "evidence": "Tyler tells a friend, “I want somewhere quieter where I can still eat with you.”",
        "wordBank": [
          {
            "text": "eat together in the quieter area",
            "correct": true
          },
          {
            "text": "stay in the noise without discussing it",
            "correct": false
          },
          {
            "text": "decide Tyler wants to be alone",
            "correct": false
          },
          {
            "text": "assume Tyler is angry with everyone",
            "correct": false
          },
          {
            "text": "stop eating because lunch is over",
            "correct": false
          }
        ]
      }
    ]
  },
  {
    "id": "i5",
    "type": "inference",
    "difficulty": 3,
    "scenario": "A sibling has to change their weekend plan. Chloe says, “I was really looking forward to that.” Later she says, “I am okay for now, but can we pick another day?”",
    "questions": [
      {
        "text": "What do we know, and what could we ask?",
        "stem": "One useful response is",
        "choices": [
          "ask which other day could work",
          "insist Chloe is hiding how she feels",
          "say Chloe never wanted the plan"
        ],
        "evidence": "Later she says, “I am okay for now, but can we pick another day?”",
        "wordBank": [
          {
            "text": "ask which other day could work",
            "correct": true
          },
          {
            "text": "insist Chloe is hiding how she feels",
            "correct": false
          },
          {
            "text": "say Chloe never wanted the plan",
            "correct": false
          },
          {
            "text": "say Chloe refused another day",
            "correct": false
          },
          {
            "text": "say the first plan already happened",
            "correct": false
          }
        ]
      }
    ]
  }
];
