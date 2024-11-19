import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, getDoc, updateDoc } from 'firebase/firestore';
import DeckEditor from './DeckEditor';
import DeckCollection from './DeckCollection';
import SpacedRepetition from '../SRS/SpacedRepetition';
import './DeckManager.css';
import { ReactComponent as OptionsIcon } from '../../Icons/cil--options.svg';

const DeckManager = ({ userId, onStartStudying }) => {
  const [decks, setDecks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [newDeckName, setNewDeckName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [srs] = useState(new SpacedRepetition(userId));
  const [deckStats, setDeckStats] = useState({});
  const [isCollectionsCollapsed, setIsCollectionsCollapsed] = useState(true);

  useEffect(() => {
    loadCollections();
  }, [userId]);

  useEffect(() => {
    loadDecks();
  }, [userId, selectedCollection]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.deck-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCollections = async () => {
    try {
      const collectionsRef = collection(db, `users/${userId}/collections`);
      const snapshot = await getDocs(collectionsRef);
      const loadedCollections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCollections(loadedCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const moveDeckToCollection = async (deckId, newCollectionId) => {
    try {
      const deckRef = doc(db, `users/${userId}/decks/${deckId}`);
      const deckDoc = await getDoc(deckRef);
      const oldCollectionId = deckDoc.data()?.collectionId;

      // Update deck's collection
      await updateDoc(deckRef, {
        collectionId: newCollectionId || null,
        updatedAt: new Date().toISOString()
      });

      // Update old collection count if it exists
      if (oldCollectionId) {
        const oldCollectionRef = doc(db, `users/${userId}/collections/${oldCollectionId}`);
        const oldCollectionDoc = await getDoc(oldCollectionRef);
        await updateDoc(oldCollectionRef, {
          deckCount: Math.max(0, (oldCollectionDoc.data()?.deckCount || 0) - 1)
        });
      }

      // Update new collection count if moving to a collection
      if (newCollectionId) {
        const newCollectionRef = doc(db, `users/${userId}/collections/${newCollectionId}`);
        const newCollectionDoc = await getDoc(newCollectionRef);
        await updateDoc(newCollectionRef, {
          deckCount: (newCollectionDoc.data()?.deckCount || 0) + 1
        });
      }

      loadDecks();
      loadCollections();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Error moving deck:', error);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const collectionsRef = collection(db, `users/${userId}/collections`);
      await addDoc(collectionsRef, {
        name: newCollectionName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deckCount: 0
      });
      setNewCollectionName('');
      loadCollections();
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const deleteCollection = async (collectionId) => {
    try {
      // Move all decks in the collection to uncategorized
      const decksRef = collection(db, `users/${userId}/decks`);
      const q = query(decksRef, where('collectionId', '==', collectionId));
      const snapshot = await getDocs(q);

      // Update each deck to remove the collectionId
      const updatePromises = snapshot.docs.map(deckDoc =>
        updateDoc(doc(db, `users/${userId}/decks/${deckDoc.id}`), {
          collectionId: null,
          updatedAt: new Date().toISOString()
        })
      );

      await Promise.all(updatePromises);

      // Delete the collection itself
      await deleteDoc(doc(db, `users/${userId}/collections/${collectionId}`));

      loadCollections();
      if (selectedCollection === collectionId) {
        setSelectedCollection(null);
      }
      loadDecks();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const renameCollection = async (collectionId, newName) => {
    try {
      const collectionRef = doc(db, `users/${userId}/collections/${collectionId}`);
      await updateDoc(collectionRef, {
        name: newName,
        updatedAt: new Date().toISOString()
      });
      loadCollections();
    } catch (error) {
      console.error('Error renaming collection:', error);
    }
  };

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
      let snapshot;

      if (selectedCollection === null) {
        // Get all decks and filter for uncategorized ones in memory
        snapshot = await getDocs(decksRef);
        const loadedDecks = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(deck => !deck.collectionId); // Keep only decks without a collectionId

        // Sort by updatedAt
        loadedDecks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setDecks(loadedDecks);
      } else {
        // For a specific collection
        const q = query(decksRef, where('collectionId', '==', selectedCollection));
        snapshot = await getDocs(q);
        const loadedDecks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by updatedAt
        loadedDecks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setDecks(loadedDecks);
      }

      // Load stats for each deck
      snapshot.docs.forEach(doc => loadDeckStats(doc.id));
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) return;

    try {
      const decksRef = collection(db, `users/${userId}/decks`);
      const newDeck = {
        name: newDeckName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Only add collectionId if a collection is selected
      if (selectedCollection) {
        newDeck.collectionId = selectedCollection;
      }

      await addDoc(decksRef, newDeck);

      if (selectedCollection) {
        const collectionRef = doc(db, `users/${userId}/collections/${selectedCollection}`);
        const collectionDoc = await getDoc(collectionRef);
        await updateDoc(collectionRef, {
          deckCount: (collectionDoc.data()?.deckCount || 0) + 1
        });
      }

      setNewDeckName('');
      loadDecks();
      loadCollections();
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const deleteDeck = async (deckId) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) return;
    try {
      const deckRef = doc(db, `users/${userId}/decks/${deckId}`);
      const deckDoc = await getDoc(deckRef);
      const collectionId = deckDoc.data()?.collectionId;

      await deleteDoc(deckRef);

      if (collectionId) {
        const collectionRef = doc(db, `users/${userId}/collections/${collectionId}`);
        const collectionDoc = await getDoc(collectionRef);
        await updateDoc(collectionRef, {
          deckCount: Math.max(0, (collectionDoc.data()?.deckCount || 0) - 1)
        });
      }

      loadDecks();
      loadCollections();
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
      const cardsRef = collection(db, `users/${userId}/decks/${deck.id}/cards`);
      const cardsSnapshot = await getDocs(cardsRef);
      const cards = cardsSnapshot.docs.map(doc => doc.data());

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

      const sharedDecksRef = collection(db, 'sharedDecks');
      const sharedDeck = await addDoc(sharedDecksRef, sharedDeckData);

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
        const newDeck = {
          name: deckName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (selectedCollection) {
          newDeck.collectionId = selectedCollection;
        }

        const deckDoc = await addDoc(decksRef, newDeck);

        if (selectedCollection) {
          const collectionRef = doc(db, `users/${userId}/collections/${selectedCollection}`);
          const collectionDoc = await getDoc(collectionRef);
          await updateDoc(collectionRef, {
            deckCount: (collectionDoc.data()?.deckCount || 0) + 1
          });
        }

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
        loadCollections();
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
      <div className="collections-header">
        <h2>Collections</h2>
        <button
          className={`collections-toggle ${isCollectionsCollapsed ? 'collapsed' : ''}`}
          onClick={() => setIsCollectionsCollapsed(!isCollectionsCollapsed)}
        >
          ▼
        </button>
      </div>

      <div className={`collections-section ${isCollectionsCollapsed ? 'collapsed' : ''}`}>
        <div className="create-collection">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="New Collection Name"
            className="auth-input"
          />
          <button onClick={createCollection} className="auth-button">
            Create Collection
          </button>
        </div>

        <div className="collections-list">
          <div
            className={`deck-collection ${!selectedCollection ? 'active' : ''}`}
            onClick={() => {
              setSelectedCollection(null);
              loadDecks();
            }}
          >
            <div className="collection-header">
              <div className="collection-title">
                <h3>Uncategorized Decks</h3>
              </div>
            </div>
          </div>

          {collections.map(collection => (
            <DeckCollection
              key={collection.id}
              collection={collection}
              onSelect={(id) => {
                setSelectedCollection(id);
                loadDecks();
              }}
              onDelete={deleteCollection}
              onRename={renameCollection}
            />
          ))}
        </div>
      </div>

      <h2>
        {selectedCollection
          ? `Decks in ${collections.find(c => c.id === selectedCollection)?.name}`
          : 'Uncategorized Decks'
        }
      </h2>

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
                    <div className="move-to-collection">
                      <button>Move to Collection</button>
                      <div className="submenu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveDeckToCollection(deck.id, null);
                          }}
                          className={!deck.collectionId ? 'active' : ''}
                        >
                          Uncategorized Decks
                        </button>
                        {collections.map(collection => (
                          <button
                            key={collection.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveDeckToCollection(deck.id, collection.id);
                            }}
                            className={deck.collectionId === collection.id ? 'active' : ''}
                          >
                            {collection.name}
                          </button>
                        ))}
                      </div>
                    </div>
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
