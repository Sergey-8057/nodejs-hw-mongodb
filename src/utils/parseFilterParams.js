const parseContactType = (type) => {
  const isString = typeof type === 'string';
  if (!isString) return;

  const validTypes = ['work', 'home', 'personal'];
  if (validTypes.includes(type)) return type;
};

const parseBoolean = (bool) => {
  if (typeof bool === 'boolean') return bool;

  if (typeof bool === 'string') {
    if (bool === 'true') return true;
    if (bool === 'false') return false;
  }

  return undefined;
};

export const parseFilterParams = (query) => {
  const { type, isFavourite } = query;

  const parsedType = parseContactType(type);
  const parsedIsFavourite = parseBoolean(isFavourite);

  return {
    type: parsedType,
    isFavourite: parsedIsFavourite,
  };
};
