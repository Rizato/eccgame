import React, { useState, useCallback, useRef } from 'react';
import './TextAdventure.css';

interface TextAdventureProps {
  onKeyGenerated: (privateKey: string) => void;
  disabled?: boolean;
}

interface AdventureState {
  userInputs: string[];
  timings: number[];
  storyFlags: string[];
  inventory: string[];
  stats: Record<string, number>;
  gameLog: string[];
  currentLocation: string;
  finalOutcome?: string;
}

const TextAdventure: React.FC<TextAdventureProps> = ({ onKeyGenerated, disabled = false }) => {
  const [gameState, setGameState] = useState<AdventureState>({
    userInputs: [],
    timings: [],
    storyFlags: [],
    inventory: [],
    stats: { courage: 0, wisdom: 0, luck: 0, stealth: 0 },
    gameLog: [
      'You find yourself standing before a mysterious shimmering portal in an ancient cave. Strange symbols glow around its edges, and whispers of forgotten magic fill the air.',
    ],
    currentLocation: 'cave_entrance',
  });

  const [currentInput, setCurrentInput] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const lastInputTimeRef = useRef<number>(Date.now());

  // Game logic for processing user input
  const processAction = useCallback(
    async (action: string) => {
      if (disabled || isComplete) return;

      const inputTime = Date.now() - lastInputTimeRef.current;
      const cleanAction = action.toLowerCase().trim();

      let response = '';
      let newLocation = gameState.currentLocation;
      const newStats = { ...gameState.stats };
      const newInventory = [...gameState.inventory];
      const newFlags = [...gameState.storyFlags];

      // Process action based on current location and input
      switch (gameState.currentLocation) {
        case 'cave_entrance':
          if (
            cleanAction.includes('enter') ||
            cleanAction.includes('portal') ||
            cleanAction.includes('through')
          ) {
            response =
              'You step boldly through the portal and emerge in a bustling magical marketplace filled with floating lanterns and exotic creatures.';
            newLocation = 'marketplace';
            newStats.courage += 2;
            newFlags.push('bold_entry');
          } else if (
            cleanAction.includes('study') ||
            cleanAction.includes('symbols') ||
            cleanAction.includes('examine')
          ) {
            response =
              'You carefully study the ancient symbols. They reveal a map showing this portal leads to the Library of Lost Spells. Knowledge fills your mind.';
            newLocation = 'library_entrance';
            newStats.wisdom += 2;
            newFlags.push('symbol_knowledge');
          } else if (
            cleanAction.includes('search') ||
            cleanAction.includes('cave') ||
            cleanAction.includes('look')
          ) {
            response =
              'Searching behind loose rocks, you discover an ancient journal warning of trials ahead. You also find a mysterious old map.';
            newLocation = 'cave_explored';
            newStats.stealth += 1;
            newInventory.push('ancient_map');
          } else if (
            cleanAction.includes('back') ||
            cleanAction.includes('leave') ||
            cleanAction.includes('exit')
          ) {
            response =
              'You decide this is too dangerous and leave the cave. But curiosity draws you back - you must see what lies beyond the portal.';
          } else {
            response =
              'You stand uncertain. The portal shimmers before you. You could enter it, study the symbols around it, or search the cave for more information.';
          }
          break;

        case 'marketplace':
          if (
            cleanAction.includes('merchant') ||
            cleanAction.includes('crystal') ||
            cleanAction.includes('buy') ||
            cleanAction.includes('shop')
          ) {
            response =
              'The crystal merchant offers you three magical crystals. You choose one that resonates with your spirit, gaining mystical power.';
            newLocation = 'crystal_path';
            newStats.wisdom += 1;
            newInventory.push('magic_crystal');
          } else if (
            cleanAction.includes('cat') ||
            cleanAction.includes('follow') ||
            cleanAction.includes('glowing')
          ) {
            response =
              'You follow a mysterious glowing cat through winding alleys to a hidden shrine where ancient spirits bless you with luck.';
            newLocation = 'spirit_shrine';
            newStats.luck += 3;
            newFlags.push('spirit_blessed');
          } else if (
            cleanAction.includes('guard') ||
            cleanAction.includes('help') ||
            cleanAction.includes('dragon')
          ) {
            response =
              'Guards tell you an ancient dragon threatens the realm. You volunteer to help, showing great courage.';
            newLocation = 'dragon_quest';
            newStats.courage += 2;
            newFlags.push('dragon_challenger');
          } else {
            response =
              'The magical marketplace bustles around you. You see a crystal merchant, a glowing cat, and guards discussing urgent matters.';
          }
          break;

        case 'library_entrance':
          if (
            cleanAction.includes('enter') ||
            cleanAction.includes('library') ||
            cleanAction.includes('knowledge')
          ) {
            response =
              'You enter the Library of Lost Spells. Towering shelves of glowing books stretch endlessly. You find the Tome of Infinite Wisdom.';
            newLocation = 'tome_chamber';
            newStats.wisdom += 2;
          } else if (
            cleanAction.includes('prepare') ||
            cleanAction.includes('supplies') ||
            cleanAction.includes('gather')
          ) {
            response =
              'You gather magical supplies and protection charms before venturing forth, showing great wisdom.';
            newLocation = 'well_prepared';
            newStats.stealth += 1;
            newInventory.push('protection_charm', 'spell_components');
          } else {
            response =
              'The library entrance beckons. You could enter directly or gather supplies first to prepare for what lies ahead.';
          }
          break;

        case 'cave_explored':
          if (
            cleanAction.includes('trials') ||
            cleanAction.includes('prepare') ||
            cleanAction.includes('ready')
          ) {
            response =
              "Using the journal's knowledge, you prepare for the three trials ahead with courage and wisdom.";
            newLocation = 'trials_prepared';
            newStats.courage += 1;
            newStats.wisdom += 1;
            newFlags.push('trial_prepared');
          } else if (
            cleanAction.includes('treasure') ||
            cleanAction.includes('gold') ||
            cleanAction.includes('seek')
          ) {
            response =
              "Following the map's treasure markings, you discover a hidden vault filled with golden artifacts.";
            newLocation = 'treasure_vault';
            newStats.luck += 2;
            newFlags.push('treasure_seeker');
          } else {
            response =
              'The ancient journal speaks of trials and treasure. The map shows multiple paths forward.';
          }
          break;

        case 'dragon_quest':
          if (
            cleanAction.includes('fight') ||
            cleanAction.includes('battle') ||
            cleanAction.includes('attack')
          ) {
            response =
              'You challenge the mighty dragon to combat. Through skill and bravery, you emerge victorious! The realm celebrates you as a legendary hero.';
            newLocation = 'victory_ending';
            newStats.courage += 4;
            newFlags.push('dragon_slayer');
          } else if (
            cleanAction.includes('talk') ||
            cleanAction.includes('reason') ||
            cleanAction.includes('peace')
          ) {
            response =
              'You speak with wisdom to the ancient dragon. Your words move its heart, and together you forge a new alliance between dragons and mortals.';
            newLocation = 'peace_ending';
            newStats.wisdom += 4;
            newFlags.push('peacemaker');
          } else {
            response =
              'The ancient dragon before you radiates power and ancient wisdom. You must choose how to approach this momentous encounter.';
          }
          break;

        // Ending locations
        case 'tome_chamber':
          response =
            'The Tome of Infinite Wisdom opens before you, flooding your mind with cosmic knowledge. You become the eternal guardian of this ancient library.';
          newLocation = 'scholar_ending';
          newFlags.push('eternal_scholar');
          break;

        case 'treasure_vault':
          if (
            cleanAction.includes('take') ||
            cleanAction.includes('gold') ||
            cleanAction.includes('wealth')
          ) {
            response =
              'You take the golden treasures and return home wealthy, using your riches to help your community thrive.';
            newLocation = 'wealthy_ending';
            newInventory.push('golden_treasures');
            newFlags.push('wealthy_hero');
          } else if (
            cleanAction.includes('leave') ||
            cleanAction.includes('generous') ||
            cleanAction.includes('others')
          ) {
            response =
              'You leave the treasure for others who might need it more. The realm itself rewards your generosity with magical gifts.';
            newLocation = 'generous_ending';
            newStats.luck += 3;
            newFlags.push('generous_soul');
          } else {
            response =
              'Before you lies immense treasure. You must decide whether to take it for yourself or leave it for others in need.';
            return;
          }
          break;

        default:
          if (
            [
              'victory_ending',
              'peace_ending',
              'scholar_ending',
              'wealthy_ending',
              'generous_ending',
            ].includes(gameState.currentLocation)
          ) {
            response =
              'Your adventure is complete. The choices you made have shaped your destiny and forged your unique path.';
          } else {
            response = 'You contemplate your next move in this mystical realm.';
          }
      }

      const newState: AdventureState = {
        ...gameState,
        userInputs: [...gameState.userInputs, action],
        timings: [...gameState.timings, inputTime],
        gameLog: [...gameState.gameLog, `> ${action}`, response],
        stats: newStats,
        inventory: newInventory,
        storyFlags: newFlags,
        currentLocation: newLocation,
      };

      // Check if adventure is complete (after ~16 meaningful inputs or reaching an ending)
      const endingLocations = [
        'victory_ending',
        'peace_ending',
        'scholar_ending',
        'wealthy_ending',
        'generous_ending',
      ];
      if (endingLocations.includes(newLocation) || newState.userInputs.length >= 16) {
        newState.finalOutcome = response;
        setIsComplete(true);

        // Generate private key from final state
        const adventureData = {
          ...newState,
          timestamp: Date.now(),
          totalTime: newState.timings.reduce((sum, time) => sum + time, 0),
        };

        const dataString = JSON.stringify(adventureData, null, 0);
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);

        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        onKeyGenerated(hashHex);
      }

      setGameState(newState);
      lastInputTimeRef.current = Date.now();
    },
    [gameState, disabled, isComplete, onKeyGenerated]
  );

  // Handle input submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent parent form submission
      if (currentInput.trim()) {
        processAction(currentInput.trim());
        setCurrentInput('');
      }
    },
    [currentInput, processAction]
  );

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent form submission
        if (currentInput.trim()) {
          processAction(currentInput.trim());
          setCurrentInput('');
        }
      }
    },
    [currentInput, processAction]
  );

  // Restart adventure
  const restartAdventure = useCallback(() => {
    setGameState({
      userInputs: [],
      timings: [],
      storyFlags: [],
      inventory: [],
      stats: { courage: 0, wisdom: 0, luck: 0, stealth: 0 },
      gameLog: [
        'You find yourself standing before a mysterious shimmering portal in an ancient cave. Strange symbols glow around its edges, and whispers of forgotten magic fill the air.',
      ],
      currentLocation: 'cave_entrance',
    });
    setCurrentInput('');
    setIsComplete(false);
    lastInputTimeRef.current = Date.now();
  }, []);

  return (
    <div className="text-adventure">
      <div className="adventure-header">
        <h4>Interactive Text Adventure</h4>
        <p>Type your actions to shape your story and generate your unique private key</p>
      </div>

      <div className="adventure-content">
        <div className="game-log">
          {gameState.gameLog.map((line, index) => (
            <div key={index} className={line.startsWith('>') ? 'user-input' : 'game-response'}>
              {line}
            </div>
          ))}
        </div>

        {!isComplete && (
          <form onSubmit={handleSubmit} className="input-section">
            <div className="input-container">
              <span className="prompt">&gt;</span>
              <input
                type="text"
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you do?"
                disabled={disabled}
                className="action-input"
                autoFocus
              />
              <button
                type="submit"
                disabled={disabled || !currentInput.trim()}
                className="submit-action"
                onClick={e => e.stopPropagation()}
              >
                ↵
              </button>
            </div>
            <small className="help-text">
              Try actions like: "enter portal", "study symbols", "search cave", "talk to merchant",
              etc.
            </small>
          </form>
        )}

        {isComplete && (
          <div className="adventure-complete">
            <div className="completion-message">
              <span className="success-icon">🏆</span>
              <div>
                <strong>Adventure Complete!</strong>
                <p>Your unique story has generated a private key.</p>
              </div>
            </div>
            <button
              type="button"
              className="restart-button"
              onClick={restartAdventure}
              disabled={disabled}
            >
              Begin New Adventure
            </button>
          </div>
        )}
      </div>

      <div className="adventure-stats">
        <div className="progress-info">
          <span>Actions taken: {gameState.userInputs.length}/16</span>
        </div>

        <div className="character-stats">
          <h6>Character Traits:</h6>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-name">Courage:</span>
              <span className="stat-value">{gameState.stats.courage}</span>
            </div>
            <div className="stat">
              <span className="stat-name">Wisdom:</span>
              <span className="stat-value">{gameState.stats.wisdom}</span>
            </div>
            <div className="stat">
              <span className="stat-name">Luck:</span>
              <span className="stat-value">{gameState.stats.luck}</span>
            </div>
            <div className="stat">
              <span className="stat-name">Stealth:</span>
              <span className="stat-value">{gameState.stats.stealth}</span>
            </div>
          </div>
        </div>

        {gameState.inventory.length > 0 && (
          <div className="inventory">
            <h6>Inventory:</h6>
            <div className="inventory-items">
              {gameState.inventory.map((item, index) => (
                <span key={index} className="inventory-item">
                  {item.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="adventure-info">
        <small className="help-text">
          <strong>How it works:</strong> Your text inputs, timing, character development, and story
          choices are combined and hashed to create a unique 256-bit private key.
        </small>
      </div>
    </div>
  );
};

export default TextAdventure;
