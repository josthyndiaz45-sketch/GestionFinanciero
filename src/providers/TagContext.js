import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as tagService from '../services/tagService';

const TagContext = createContext();

export function TagProvider({ children }) {
  const [tagMap, setTagMap] = useState({});

  useEffect(() => {
    tagService.getTransactionTags().then(setTagMap);
  }, []);

  const setTag = useCallback(async (txId, tag) => {
    const updated = await tagService.setTransactionTag(txId, tag);
    setTagMap(updated);
  }, []);

  const getTag = useCallback((txId) => tagMap[txId] || null, [tagMap]);

  const getTagColor = (tag) => {
    switch (tag) {
      case 'Personal': return '#6366F1';
      case 'Evento': return '#F59E0B';
      case 'Trabajo': return '#10B981';
      case 'Estudios': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <TagContext.Provider value={{ tagMap, setTag, getTag, getTagColor }}>
      {children}
    </TagContext.Provider>
  );
}

export function useTags() {
  return useContext(TagContext);
}
