import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import DeckEditor from './DeckEditor';
import SpacedRepetition from '../SRS/SpacedRepetition';
import './DeckManager.css';
import { ReactComponent as OptionsIcon } from '../../Icons/cil--options.svg';

const DeckManager = ({ userId, onStartStudying }) => {
  const [decks, setDecks] = useState([]);
  const [newDeckName, setNewDeckName] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [srs] = useState(new SpacedRepetition(userId));
  const [deckStats, setDeckStats] = useState({});

  useEffect(() => {
    loadDecks();
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.deck-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDeckStats = async (deckId) => {
    try {
      const cardsRef = collection(db, `users/${userId}/decks/${deckId}/cards`);
      const snapshot = await getDocs(cardsRef);
      let totalSuccessRate = 0;
      let cardsWithStats = 0;

      for (const cardDoc of snapshot.docs) {
        const cardStats = await srs.getCardStats(cardDoc.id);
        if (cardStats && typeof cardStats.successRate === 'number') {
          totalSuccessRate += cardStats.successRate;
          cardsWithStats++;
        }
      }

      const averageSuccessRate = cardsWithStats > 0 ? Math.round(totalSuccessRate / cardsWithStats) : 0;
      setDeckStats(prev => ({
        ...prev,
        [deckId]: averageSuccessRate
      }));
    } catch (error) {
      console.error('Error loading deck stats:', error);
    }
  };

  const loadDecks = async () => {
    try {
      const decksRef = collection(db, `users/${userId}/decks`);
      const q = query(decksRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const loadedDecks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDecks(loadedDecks);

      // Load stats for each deck
      loadedDecks.forEach(deck => loadDeckStats(deck.id));
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) return;

    try {
      const decksRef = collection(db, `users/${userId}/decks`);
      await addDoc(decksRef, {
        name: newDeckName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setNewDeckName('');
      loadDecks();
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const deleteDeck = async (deckId) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/decks/${deckId}`));
      loadDecks();
      if (selectedDeck === deckId) {
        setSelectedDeck(null);
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };

  const shareDeck = async (deck) => {
    if (!window.confirm('Share this deck with the community?')) return;

    try {
      // Get all cards from the deck
      const cardsRef = collection(db, `users/${userId}/decks/${deck.id}/cards`);
      const cardsSnapshot = await getDocs(cardsRef);
      const cards = cardsSnapshot.docs.map(doc => doc.data());

      // Create shared deck with only defined fields
      const sharedDeckData = {
        name: deck.name,
        language: deck.language || 'Other',
        description: deck.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: userId,
        likes: 0,
        imports: 0,
        cardCount: cards.length
      };

      // Create shared deck
      const sharedDecksRef = collection(db, 'sharedDecks');
      const sharedDeck = await addDoc(sharedDecksRef, sharedDeckData);

      // Add all cards to shared deck
      const sharedCardsRef = collection(db, `sharedDecks/${sharedDeck.id}/cards`);
      for (const card of cards) {
        await addDoc(sharedCardsRef, {
          title: card.title || '',
          description: card.description || '',
          solution: card.solution || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      alert('Deck shared successfully!');
    } catch (error) {
      console.error('Error sharing deck:', error);
      alert('Failed to share deck: ' + error.message);
    }
  };

  const exportDeck = async (deck) => {
    try {
      const cardsRef = collection(db, `users/${userId}/decks/${deck.id}/cards`);
      const snapshot = await getDocs(cardsRef);
      const deckCards = snapshot.docs.map(doc => ({
        title: doc.data().title,
        description: doc.data().description,
        solution: doc.data().solution,
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
      }));

      const dataStr = JSON.stringify(deckCards, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `${deck.name}_flashcards.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting deck:', error);
    }
  };

  const importDeck = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedCards = JSON.parse(e.target.result);
        if (!Array.isArray(importedCards)) {
          throw new Error('Invalid format: Expected an array of cards');
        }

        const deckName = file.name.replace(/\.[^/.]+$/, "");
        const decksRef = collection(db, `users/${userId}/decks`);
        const deckDoc = await addDoc(decksRef, {
          name: deckName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const cardsRef = collection(db, `users/${userId}/decks/${deckDoc.id}/cards`);

        for (const card of importedCards) {
          if (!card.title || !card.description || !card.solution) {
            console.warn('Skipping invalid card:', card);
            continue;
          }

          await addDoc(cardsRef, {
            title: card.title,
            description: card.description,
            solution: card.solution,
            createdAt: card.createdAt || new Date().toISOString(),
            updatedAt: card.updatedAt || new Date().toISOString()
          });
        }

        loadDecks();
      } catch (error) {
        console.error('Error importing deck:', error);
        alert('Error importing deck: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  if (selectedDeck) {
    return (
      <DeckEditor
        userId={userId}
        deckId={selectedDeck}
        onBack={() => {
          setSelectedDeck(null);
          loadDecks();
        }}
      />
    );
  }

  return (
    <div className="deck-manager">
      <h2>Decks</h2>

      <div className="create-deck">
        <input
          type="text"
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          placeholder="New Deck Name"
          className="auth-input"
        />
        <button onClick={createDeck} className="auth-button">
          Create Deck
        </button>
      </div>

      <div className="import-deck">
        <input
          type="file"
          accept=".json"
          onChange={importDeck}
          className="file-input"
        />
        <label>Import Deck (JSON)</label>
      </div>

      <div className={`deck-list ${openDropdown ? 'has-open-dropdown' : ''}`}>
        {decks.map(deck => (
          <div
            key={deck.id}
            className={`deck-item ${openDropdown === deck.id ? 'active' : ''}`}
            onClick={(e) => {
              if (!e.target.closest('.deck-dropdown')) {
                onStartStudying(deck.id);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className="deck-header">
              <div className="deck-dropdown">
                <button
                  className="options-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === deck.id ? null : deck.id);
                  }}
                >
                  <OptionsIcon />
                </button>

                {openDropdown === deck.id && (
                  <div className="dropdown-menu">
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeck(deck.id);
                      setOpenDropdown(null);
                    }}>
                      Manage Cards
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      shareDeck(deck);
                    }}>
                      Share Deck
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      exportDeck(deck);
                    }}>
                      Export
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDeck(deck.id);
                      }}
                      className="delete"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="deck-title">
                <h3>{deck.name}</h3>
                {deck.language && (
                  <span className="deck-language">{deck.language}</span>
                )}
              </div>

              {deckStats[deck.id] !== undefined && (
                <div className="deck-success-rate">
                  Success Rate: {deckStats[deck.id]}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeckManager;
