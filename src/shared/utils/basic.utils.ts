import ms from 'ms';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import argon2 from 'argon2';
import { urlAlphabet } from 'nanoid';
import { customAlphabet } from 'nanoid/non-secure';

dayjs.extend(utc);

export const capitalize = (str: string) => {
  str = str.trim();
  str = str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
  return str;
};

export const capitalizeEachWord = (str: string) => {
  const words = str.trim().split(' ');
  words.forEach((word, index) => {
    words[index] = word[0].toUpperCase() + word.slice(1);
  });
  return words.join(' ');
};

export const getHashedPassword = async (password: string) => {
  return await argon2.hash(password);
};

export const matchPassword = async (hashPassword: string, password: string) => {
  return await argon2.verify(hashPassword, password);
};

export const roundUptoTwoDecimals = (num: number) => {
  return parseFloat(parseFloat(String(num)).toFixed(2))
}

export const getCustomSizeNanoId = (size: number) => {
  const nanoid = customAlphabet(urlAlphabet, size)
  return nanoid()
};

export const getNumericNanoId = (size: number) => {
  const nanoid = customAlphabet('0123456789', size)
  return nanoid()
};

export const delay = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const getTokenExpiryDate = (expiryTime: string) => {
  const expiryTimeInMs = ms(expiryTime);
  const expiresAt = new Date(Date.now() + expiryTimeInMs);
  return expiresAt;
};

export const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const getSearchQueryFilters = (searchKeyword: string, searchFilters: string[]) => {
  const filters = []
  const regexSearchExpr: any = {
    $regex: escapeRegExp(searchKeyword),
    $options: 'i',
  };
  searchFilters.forEach((searchFilter: string) => {
    filters.push({ [searchFilter]: regexSearchExpr });
  });
  return filters
}

export const getDayjsDate = (date?: string | Date) => {
  if (date) return dayjs(date);
  return dayjs();
}

export const formatDate = (date?: string | Date) => {
  const formatStr = 'D MMM YYYY h:mm A';
  if (date) return dayjs(date).utc().utcOffset(1).format(formatStr);
  return dayjs().utc().utcOffset(1).format(formatStr);
}

export const getNLDayjsDate = (date?: string | Date) => {
  if (date) return dayjs(formatDate(date));
  return dayjs(formatDate());
}

export const addDate = (quantity: number, unit: 'd' | 'w' | 'M' | 'h' | 'm' | 's', date?: Date) => {
  if (date) return dayjs(date).add(quantity, unit).toDate();
  return dayjs().add(quantity, unit).toDate();
}

export const getIPAddress = (ipAddress?: string) => {
  return ipAddress && ipAddress.startsWith('::ffff:') ? ipAddress.slice(7) : '0.0.0.0';
}
