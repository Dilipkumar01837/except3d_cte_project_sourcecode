import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const keys = Object.keys(p).filter(k => {
  const v = (p as any)[k];
  return v && typeof v === 'object' && 'findMany' in v;
});
console.log('aiHintHistory exists:', !!p.aiHintHistory);
console.log('Delegated models:', keys.join(', '));
await p.$disconnect();
