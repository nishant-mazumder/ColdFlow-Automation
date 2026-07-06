import { prisma } from './prisma';
console.log('Prisma keys:', Object.keys(prisma).filter(k => !k.startsWith('_')));
