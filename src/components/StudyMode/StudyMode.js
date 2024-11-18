import React, { useState, useEffect } from 'react';
import CodeEditor from '../CodeEditor/CodeEditor';
import SpacedRepetition from '../SRS/SpacedRepetition';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import './StudyMode.css';

const StudyMode = ({ userId, deckId }) => {
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [srs] = useState(new SpacedRepetition(userId));
  const [stats, setStats] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  useEffect(() => {
    if (userId && deckId) {
      loadDeckAndCards();
    }
  }, [userId, deckId]);

  const loadDeckAndCards = async () => {
    try {
      const deckRef = doc(db, `users/${userId}/decks/${deckId}`);
      const deckDoc = await getDoc(deckRef);

      if (!deckDoc.exists()) {
        setError('Deck not found');
        return;
      }

      setDeckName(deckDoc.data().name);

      const cardsRef = collection(deckRef, 'cards');
      const snapshot = await getDocs(cardsRef);

      if (snapshot.empty) {
        setError('No cards found in this deck');
        return;
      }

      const dueCards = await srs.getDueCards(deckId);

      const allCards = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          progress: dueCards.find(c => c.cardId === doc.id)
        }))
        .filter(card => !card.progress || new Date(card.progress.nextReview) <= new Date());

      setCards(allCards);
      setError('');
    } catch (error) {
      console.error('Error loading deck and cards:', error);
      setError('Failed to load deck content. Please try again.');
    }
  };

  const loadCardStats = async () => {
    if (!cards.length) return;
    const currentCard = cards[currentCardIndex];
    try {
      const cardStats = await srs.getCardStats(currentCard.id);
      setStats(cardStats);
    } catch (error) {
      console.error('Error loading card stats:', error);
      setError('Failed to load card statistics');
    }
  };

  useEffect(() => {
    loadCardStats();
    setHintLevel(0);
    setShowHint(false);
  }, [currentCardIndex, cards]);

  const handleAnswer = async (wasSuccessful) => {
    const currentCard = cards[currentCardIndex];
    try {
      await srs.updateCardProgress(deckId, currentCard.id, wasSuccessful);

      if (wasSuccessful) {
        setFeedback('Correct! 🎉');
      } else {
        setFeedback('Try again');
      }

      setTimeout(() => {
        setFeedback('');
        if (wasSuccessful) {
          handleNext();
          setShowAnswer(false);
          setUserCode('');
          setHintLevel(0);
          setShowHint(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress');
    }
  };

  const normalizeCode = (code) => {
    return code
      .replace(/\s+/g, '')
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      .replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, 'function')
      .replace(/(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, 'let')
      .replace(/;/g, '')
      .replace(/\(\)/g, '')
      .toLowerCase();
  };

  const checkCodeSolution = () => {
    const currentCard = cards[currentCardIndex];

    try {
      const normalizedUserCode = normalizeCode(userCode);
      const normalizedSolution = normalizeCode(currentCard.solution);
      let isCorrect = normalizedUserCode === normalizedSolution;

      if (!isCorrect) {
        try {
          const createSandbox = (code) => {
            let sandbox = {};
            const context = {
              console: { log: (...args) => sandbox.output.push(args) },
              Array, Object, String, Number, Boolean, Math,
            };

            sandbox.output = [];

            const fn = new Function('context', `
              with(context) {
                ${code}
              }
              return context;
            `);

            try {
              fn(context);
            } catch (e) {
              sandbox.error = e;
            }

            return sandbox;
          };

          const userResult = createSandbox(userCode);
          const solutionResult = createSandbox(currentCard.solution);

          isCorrect = JSON.stringify(userResult.output) === JSON.stringify(solutionResult.output) &&
            !userResult.error && !solutionResult.error;
        } catch (e) {
          console.error('Error evaluating code behavior:', e);
          isCorrect = false;
        }
      }

      setShowAnswer(true);
      handleAnswer(isCorrect);
    } catch (error) {
      console.error('Error checking solution:', error);
      setError('Failed to check solution');
    }
  };

  const showNextHint = () => {
    setShowHint(true);
    setHintLevel(prev => Math.min(prev + 1, 3));
  };

  const getHint = () => {
    const currentCard = cards[currentCardIndex];
    const solution = currentCard.solution;

    switch (hintLevel) {
      case 1:
        return `Think about using: ${solution.match(/\b\w+(?=\s*\()/g)?.join(', ')}`;
      case 2:
        return `Structure: ${solution.replace(/[a-zA-Z0-9]/g, '_')}`;
      case 3:
        return `First line: ${solution.split('\n')[0]}`;
      default:
        return 'Need a hint?';
    }
  };

  const handleNext = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      setUserCode('');
      setError('');
      setHintLevel(0);
      setShowHint(false);
    } else {
      loadDeckAndCards();
      setCurrentCardIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
      setUserCode('');
      setError('');
      setHintLevel(0);
      setShowHint(false);
    }
  };

  if (error) {
    return <div className="study-mode error-message">{error}</div>;
  }

  if (!cards.length) {
    return (
      <div className="study-mode">
        <h2>All Caught Up! 🎉</h2>
        <p className="challenge-description">No cards are due for review at this time. Check back later!</p>
      </div>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <div className="study-mode">
      <div className="study-header">
        <div className="header-left">
          <button onClick={handlePrevious} disabled={currentCardIndex === 0}>←</button>
          <h2>{currentCard.title}</h2>
          <button onClick={handleNext} disabled={currentCardIndex === cards.length - 1}>→</button>
        </div>
        <div className="header-right">
          {stats && (
            <div className="success-rate">
              Success Rate: {stats.successRate}%
            </div>
          )}
        </div>
      </div>

      <div className="problem-description">
        <p>{currentCard.description}</p>
        {showHint && (
          <div className="hint">
            <p>{getHint()}</p>
          </div>
        )}
      </div>

      <div className="editor-section">
        <div className="editor-header">
          <span>Code Editor</span>
          <div className="editor-actions">
            <button className="hint-button" onClick={showNextHint}>
              Hint
            </button>
            <button
              className="submit-button"
              onClick={showAnswer ? () => {
                setShowAnswer(false);
                setUserCode('');
              } : checkCodeSolution}
            >
              {showAnswer ? 'Try Again' : 'Submit'}
            </button>
          </div>
        </div>

        <CodeEditor
          code={showAnswer ? currentCard.solution : userCode}
          onChange={setUserCode}
          readOnly={showAnswer}
          placeholder="Write your solution here..."
        />

        {feedback && (
          <div className={`feedback ${feedback.includes('Correct') ? 'success' : 'error'}`}>
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyMode;
