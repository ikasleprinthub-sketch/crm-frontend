/**
 * Seed script — creates the full user hierarchy:
 *   Super Admin → Admin → Team Leaders (Alpha, Beta, Gamma) → Employees
 *
 * Usage:
 *   node scripts/seed.js
 *   API_URL=http://localhost:5000/api node scripts/seed.js
 *
 * Credentials are printed to the console after seeding.
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const http    = axios.create({ baseURL: API_URL });

// ─── Helper ───────────────────────────────────────────────────────────────────

async function register(payload) {
  const res = await http.post('/auth/register', payload);
  return res.data.data;
}

async function loginAs(email, password) {
  const res = await http.post('/auth/login', { email, password });
  const { user, token } = res.data.data;
  http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return user;
}

async function approveUser(adminToken, userId) {
  await http.patch(`/users/${userId}/approve`, {}, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SUPER_ADMIN = {
  name:     'Super Admin',
  email:    'superadmin@company.com',
  password: 'SuperAdmin@123',
  role:     'SUPER_ADMIN',
};

const ADMIN = {
  name:     'Admin Manager',
  email:    'admin@company.com',
  password: 'Admin@123',
  role:     'ADMIN',
};

const TEAM_LEADERS = [
  { name: 'Alpha',  email: 'alpha@company.com',  password: 'Alpha@123',  role: 'MANAGER' },
  { name: 'Beta',   email: 'beta@company.com',   password: 'Beta@123',   role: 'MANAGER' },
  { name: 'Gamma',  email: 'gamma@company.com',  password: 'Gamma@123',  role: 'MANAGER' },
];

// One employee per team — managerId filled in at runtime
const EMPLOYEES_TEMPLATE = [
  { name: 'Alpha Employee 1',  email: 'alpha.emp1@company.com',  password: 'Emp@123', role: 'EMPLOYEE', team: 'Alpha' },
  { name: 'Beta Employee 1',   email: 'beta.emp1@company.com',   password: 'Emp@123', role: 'EMPLOYEE', team: 'Beta'  },
  { name: 'Gamma Employee 1',  email: 'gamma.emp1@company.com',  password: 'Emp@123', role: 'EMPLOYEE', team: 'Gamma' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  Starting CRM seed...\n');
  const credentials = [];

  // 1. Register super admin
  let superAdminUser;
  try {
    superAdminUser = await register(SUPER_ADMIN);
    credentials.push({ role: 'Super Admin', ...SUPER_ADMIN });
    console.log(`✅  Registered Super Admin: ${SUPER_ADMIN.email}`);
  } catch (e) {
    console.warn(`⚠️   Super Admin already exists or registration failed — attempting login`);
  }

  // Login as super admin to approve subsequent users
  let saToken;
  try {
    const sa = await loginAs(SUPER_ADMIN.email, SUPER_ADMIN.password);
    saToken = http.defaults.headers.common['Authorization']?.replace('Bearer ', '');
    console.log(`🔑  Logged in as Super Admin (${sa.name})\n`);
  } catch (e) {
    console.error('❌  Cannot login as Super Admin. Aborting.', e.message);
    process.exit(1);
  }

  // 2. Register and approve Admin
  let adminUser;
  try {
    const registered = await register(ADMIN);
    adminUser = registered?.user ?? registered;
    if (adminUser?.id) await approveUser(saToken, adminUser.id);
    credentials.push({ role: 'Admin', ...ADMIN });
    console.log(`✅  Registered Admin: ${ADMIN.email}`);
  } catch (e) {
    console.warn(`⚠️   Admin: ${e.response?.data?.message || e.message}`);
  }

  // 3. Register and approve Team Leaders
  const leaderMap = {};
  for (const leader of TEAM_LEADERS) {
    try {
      const registered = await register(leader);
      const leaderUser = registered?.user ?? registered;
      if (leaderUser?.id) {
        await approveUser(saToken, leaderUser.id);
        leaderMap[leader.name] = leaderUser.id;
      }
      credentials.push({ role: `Team Leader (${leader.name})`, ...leader });
      console.log(`✅  Registered Team Leader [${leader.name}]: ${leader.email}`);
    } catch (e) {
      console.warn(`⚠️   Team Leader ${leader.name}: ${e.response?.data?.message || e.message}`);
    }
  }

  // 4. Register and approve Employees (assigned to their team leader)
  for (const emp of EMPLOYEES_TEMPLATE) {
    const managerId = leaderMap[emp.team];
    try {
      const payload    = { name: emp.name, email: emp.email, password: emp.password, role: emp.role, managerId };
      const registered = await register(payload);
      const empUser    = registered?.user ?? registered;
      if (empUser?.id) await approveUser(saToken, empUser.id);
      credentials.push({ role: `Employee (${emp.team} team)`, ...emp });
      console.log(`✅  Registered Employee [${emp.team} team]: ${emp.email}`);
    } catch (e) {
      console.warn(`⚠️   Employee ${emp.name}: ${e.response?.data?.message || e.message}`);
    }
  }

  // ─── Print credentials ────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(62));
  console.log('  SEEDED CREDENTIALS');
  console.log('═'.repeat(62));
  for (const c of credentials) {
    console.log(`\n  Role     : ${c.role}`);
    console.log(`  Email    : ${c.email}`);
    console.log(`  Password : ${c.password}`);
  }
  console.log('\n' + '═'.repeat(62));
  console.log('  Seed complete ✅');
  console.log('═'.repeat(62) + '\n');
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.response?.data || err.message);
  process.exit(1);
});
