// TEMP
export const RAG_PUBLIC_DIRECTORY_PATH = 'public/tmp/rag'

// HSWSLib
export const RAG_VECTOR_STORE_PATH = 'vectorstore/rag-store.index'
export const RAG_VECTOR_STORE_FILE_PATH = 'vectorstore/rag-store.index/hnswlib.index'

// ChromaDB
export const VDB_RAG_COLLECTION_NAME = 'rag-store'

// Hugging Face
export const HUGGING_FACE_MODEL = 'BAAI/bge-base-en-v1.5' //'BAAI/bge-large-en'

// Chat
export const GPT3_5_OPENAI_MODEL = 'gpt-3.5-turbo'
export const GPT4_OPENAI_MODEL = 'gpt-4'
export const GPT4O_OPENAI_MODEL = 'gpt-4o'
export const GPT4O_MINI_OPENAI_MODEL = 'gpt-4o-mini'
export const LLAMA2_MODEL = 'llama2'
export const MIXTRAL_MODEL = 'mixtral'
export const CLAUDE_3_5_SONNET_MODEL = 'claude-3-5-sonnet-20240620'
export const CLAUDE_3_OPUS_MODEL = 'claude-3-opus-20240229'
export const CLAUDE_3_HAIKU_MODEL = 'claude-3-haiku-20240307'

// Podcast data
export const PRE_DEFINED_TAGS = `
- cash game
- live
- tournament
- theory
- online
- Andrew
- Carlos
- Nate
- AA
- KK
- Meeting
- QQ
- AKo
- AQo
- homegame
- TT
- 99
- JJ
- AKs
- bounty
- satellites
- game theory
- finaltable
- ranges
- ICM
- KQs
- exploits
- AJo
- blind defense
- not a hand history
- 66
- AQs
- QJs
- 77
- bubble
- plo
- 98s
- ATs
- bet size
- c - betting
- 88
- KJs
- multiway
- should i call
- stack size
- straddle
- 3 - betting
- AK
- KQo
- SNG
- fast fold
- limpedpot
- 44
- A5s
- AJ
- AQ
- J9s
- JTo
- JTs
- KTs
- T9s
- A7s
- KJo
- bomb pot
- late regging
- mental game
- 33
- 76s
- 87s
- A4s
- A8s
- A9o
- A9s
- QJo
- draw
- ethics
- 75s
- AJs
- K7s
- KT
- T7s
- T8s
- Tommy Angelo
- bluffing
- small blind
- squeeze
- 54s
- 55
- 65s
- 98o
- A5o
- ATo
- K9o
- K9s
- KTo
- Q8s
- QTo
- QTs
- game selection
- headsup
- should i bluff
- solver
- wsop
- 3 bet pot
- 53s
- A2s
- A3s
- AT
- J7s
- K5s
- Q9o
- cash
- checking
- hero fold
- overbetting
- preflop
- study
- 22
- 4 - betting
- 43s
- 54o
- 86s
- 96s
- A4o
- A6o
- A7o
- Dr.Kamikaze
- GTOWizard
- Gloria Jackson
- J8
- K3s
- K4s
- K5o
- KJ
- Q2s
- Q9s
- QT
- bankroll
- bluff catching
- check raising
- donkbet
- ev
- flop
- folds
- nit
- pro
- rake
- short stack
- targeting
- value betting
- variants
- 5 - betting
- 64s
- 65o
- 72o
- 76o
- 85o
- 85s
- 86o
- 87o
- 94s
- 97s
- 9854
- A6s
- HUDs
- ITM
- J2s
- J4o
- J6s
- J8s
- J9o
- July
- K2s
- MTT SNG
- O8
- OOP
- Q3s
- Q5s
- Q7s
- T3s
- T7o
- T9o
- TPD
- ace magnets
- big stack
- blocker
- books
- bully
- charts
- cheating
- checking dark
- coin flip
- cold - calling
- database
- deals
- decision making
- deep stacks
- dry side pot
- flip and go
- laddering
- leading
- leak - finding
- life
- loss aversion
- low SPR(stack - to - pot ratio)
- micros
- mindset
- monotone flop
- mystery bounty
- node locking
- odds
- overlay
- pko
- prop bet
- reads
- roi
- run it twice
- self - indulgence
- set mining
- short handed
- should i jam
- sk
- slow playing
- smallpairs
- spr(stack - to - pot ratio)
- spread limit
- staking
- stalling
- stats
- storytime
- streamed
- suited
- tipping
- top pair
- training product
- variance
- vpip(voluntarily put $ into the pot)
`;

export const SUMMARY_EXAMPLE = `
### [Summary] Thinking Poker Daily Episode 3 -  Andrew and Carlos face a river raise

- **Hosts:** Nate and Carlos
- **Listener Question:** Jim asks about a hand he played in a low-stakes tournament, seeking to identify leaks in his play.
- **Game Details:**
  - Blind level: 50-100
  - Hero's stack: 12,000 (120 big blinds)
  - Villains' stacks: All covered Hero

- **Hand Breakdown:**
  - **Pre-flop:** 
    - Hero limps in the small blind with King Jack offsuit.
    - Big blind checks; four players see the flop.
  
  - **Flop:** 
    - Flop comes Ace, Queen, Ten (Rainbow).
    - Hero flops the nuts and bets 165.
    - Villain raises to 800; one player calls.
    - Hero re-raises to 1700; both players call.
  
  - **Turn:** 
    - Turn is a five (Ace-Queen-Ten-Five).
    - Hero bets about 75% of the pot; both players call.

  - **River:** 
    - River is an Ace, making it a dangerous card for Hero.
    - Hero shoves for roughly two-thirds of the pot.

- **Discussion Points:**
  - **Pre-flop Play:**
    - Carlos expresses caution about playing King Jack offsuit out of position.
    - Nate counters that if players won’t fold, raising might be a better option.
  
  - **Flop Betting:**
    - Carlos believes Hero's flop bet is too small; recommends betting larger to build the pot.
  
  - **Turn Betting:**
    - Both agree that the turn bet is appropriate, though Carlos would consider betting slightly larger.
  
  - **River Play:**
    - Nate supports the river shove, emphasizing that low-stakes opponents often call with weaker hands.
    - Carlos agrees, stating that Hero should expect opponents to call with worse hands.

- **Final Thoughts:**
  - Nate advises against checking the river with the intent to fold, suggesting that Jim's bet was justified despite being drawn out on.
  - They conclude that Jim should focus on pre-flop and flop plays to improve his overall strategy.

- **Closing:** 
  - Nate thanks Jim for his question, encouraging thoughtful reflection on poker hands.
`;