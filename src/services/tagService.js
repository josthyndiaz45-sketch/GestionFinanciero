import AsyncStorage from '@react-native-async-storage/async-storage';

const TAGS_KEY = '@transaction_tags';
const AVAILABLE_TAGS = ['Personal', 'Evento', 'Trabajo', 'Estudios'];

export { AVAILABLE_TAGS };

export async function getTransactionTags() {
  const raw = await AsyncStorage.getItem(TAGS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setTransactionTag(transactionId, tag) {
  const all = await getTransactionTags();
  if (tag) {
    all[transactionId] = tag;
  } else {
    delete all[transactionId];
  }
  await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(all));
  return all;
}

export async function getTransactionsByTag(tag) {
  const all = await getTransactionTags();
  return Object.entries(all)
    .filter(([, t]) => t === tag)
    .map(([id]) => id);
}
