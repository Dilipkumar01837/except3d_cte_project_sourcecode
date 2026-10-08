/**
 * Creates (or promotes) an admin account for the admin dashboard.
 *
 * Usage:
 *   tsx scripts/create-superuser.ts <email> <username> <password> [role]
 *
 * Idempotent: an existing user with the same email or username has its
 * password and role updated instead of a duplicate being created.
 * Only a SUPER_ADMIN may be created through this script; it is meant for
 * bootstrapping, not routine user management (that belongs to the admin API).
 */

import { PrismaClient, UserRole } from '@prisma/client';
import '../src/config/index.js';
import { hashPassword } from '../src/shared/lib/crypto.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [email, username, password, roleArg] = process.argv.slice(2);

  if (!email || !username || !password) {
    console.error('Usage: tsx scripts/create-superuser.ts <email> <username> <password> [role]');
    process.exit(1);
  }

  const role = (roleArg ?? 'SUPER_ADMIN') as UserRole;
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    console.error(`Invalid role "${role}". Use ADMIN or SUPER_ADMIN.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const [byEmail, byUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  const clash = byEmail && byUsername && byEmail.id !== byUsername.id;
  if (clash) {
    console.error(`Username "${username}" already belongs to a different account.`);
    process.exit(1);
  }

  const user = byEmail ?? byUsername;
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { email, username, passwordHash, role, isActive: true, emailVerified: true },
    });
    console.log(`Updated ${email} (${username}) to ${role} on existing account ${user.id}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
        isActive: true,
        emailVerified: true,
        authProvider: 'EMAIL',
        profile: {
          create: {
            displayName: username,
            level: 1,
            xp: 0,
            coins: 100,
            rank: 'BEGINNER',
            currentWorld: 'PYTHON_FOREST',
            codingStreak: 0,
          },
        },
      },
    });
    console.log(`Created ${role} account ${created.id}: ${email} (${username})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
