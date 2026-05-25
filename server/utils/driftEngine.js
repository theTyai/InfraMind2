// server/utils/driftEngine.js

/**
 * Normalizes a route path for comparison (ignores trailing slashes, leading slashes, and parameters like :id).
 */
function normalizePath(path) {
  if (!path) return '';
  return path
    .toLowerCase()
    .replace(/\/+/g, '/') // remove duplicate slashes
    .replace(/^\/|\/$/g, '') // strip leading and trailing slashes
    .replace(/:[a-zA-Z0-9_]+/g, '*') // normalize path parameters to wildcard
    .trim();
}

/**
 * Extracts Express/Koa/Fastify routes from file content.
 */
function extractRoutesFromCode(content) {
  const routes = [];
  // Regex to capture router.get('/path', ...) or app.post('/path', ...)
  // e.g. .get('/api/users',
  const routeRegex = /\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/gi;
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    
    // Ignore static files/extensions or invalid routes
    if (path.includes('.') || path.startsWith('http')) continue;
    
    routes.push({
      method,
      route: path,
      normalized: normalizePath(path)
    });
  }
  return routes;
}

/**
 * Extracts database collections or tables from file content.
 */
function extractDbCollectionsFromCode(content, fileName = '') {
  const collections = new Set();
  
  // 1. Prisma models: model User {
  if (fileName.endsWith('.prisma')) {
    const prismaRegex = /model\s+(\w+)\s*\{/g;
    let match;
    while ((match = prismaRegex.exec(content)) !== null) {
      collections.add(match[1].toLowerCase());
    }
  }

  // 2. Mongoose: mongoose.model('User', schema)
  const mongooseRegex = /mongoose\.model\(\s*['"`](\w+)['"`]/gi;
  let match;
  while ((match = mongooseRegex.exec(content)) !== null) {
    collections.add(match[1].toLowerCase());
  }

  // 3. Firestore: db.collection('users')
  const firestoreRegex = /db\.collection\(\s*['"`]([^'"`]+)['"`]\)/gi;
  while ((match = firestoreRegex.exec(content)) !== null) {
    collections.add(match[1].toLowerCase());
  }

  // 4. Sequelize: sequelize.define('user', ...)
  const sequelizeRegex = /\.define\(\s*['"`](\w+)['"`]/gi;
  while ((match = sequelizeRegex.exec(content)) !== null) {
    collections.add(match[1].toLowerCase());
  }

  return Array.from(collections);
}

/**
 * Performs drift analysis between planned architecture and repo source code.
 */
async function analyzeRepositoryDrift(owner, repo, branch, accessToken, plannedApis, plannedDbSchema) {
  const headers = {
    'Authorization': `token ${accessToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'InfraMind-App'
  };

  // 1. Fetch default branch if not specified
  let targetBranch = branch;
  if (!targetBranch) {
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        targetBranch = repoData.default_branch || 'main';
      } else {
        targetBranch = 'main';
      }
    } catch (e) {
      targetBranch = 'main';
    }
  }

  // 2. Fetch Git tree recursively
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });
  if (!treeRes.ok) {
    throw new Error(`Failed to retrieve GitHub repository tree. Status: ${treeRes.status}`);
  }

  const treeData = await treeRes.json();
  const files = treeData.tree || [];

  // Filter files that are likely to contain endpoints or schemas
  const codeFiles = files.filter(f => {
    if (f.type !== 'blob') return false;
    const pathLower = f.path.toLowerCase();
    
    // Ignore node_modules, tests, client code, locks, config
    if (
      pathLower.includes('node_modules') || 
      pathLower.includes('/test/') || 
      pathLower.includes('/tests/') ||
      pathLower.includes('package-lock') ||
      pathLower.includes('yarn.lock') ||
      pathLower.includes('.env') ||
      pathLower.includes('.git')
    ) {
      return false;
    }

    // Capture JS, TS, Python, Go, Ruby, PHP, Rust, Prisma files
    return /\.(js|ts|py|go|rb|php|rs|prisma)$/i.test(f.path);
  });

  const parsedRoutes = [];
  const parsedCollections = new Set();

  // Limit content scanning to max 12 files to respect rate limits and keep it performant
  const scanLimit = Math.min(codeFiles.length, 12);
  const filesToScan = codeFiles
    .sort((a, b) => {
      // Prioritize files in 'routes', 'controllers', 'models', 'server', 'app' directories
      const scoreFile = (p) => {
        const lower = p.toLowerCase();
        let s = 0;
        if (lower.includes('route')) s += 10;
        if (lower.includes('controller')) s += 8;
        if (lower.includes('model')) s += 8;
        if (lower.includes('schema')) s += 8;
        if (lower.includes('server.js') || lower.includes('index.js') || lower.includes('app.js')) s += 5;
        return s;
      };
      return scoreFile(b.path) - scoreFile(a.path);
    })
    .slice(0, scanLimit);

  for (const file of filesToScan) {
    try {
      const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${targetBranch}`;
      const fileRes = await fetch(fileUrl, { 
        headers: {
          ...headers,
          'Accept': 'application/vnd.github.v3.raw' // retrieve raw content directly
        }
      });
      if (fileRes.ok) {
        const content = await fileRes.text();
        
        // Extract endpoints
        const fileRoutes = extractRoutesFromCode(content);
        parsedRoutes.push(...fileRoutes);

        // Extract database schemas
        const fileCollections = extractDbCollectionsFromCode(content, file.path);
        fileCollections.forEach(c => parsedCollections.add(c));
      }
    } catch (err) {
      console.warn(`[Drift Engine] Failed to scan file ${file.path}:`, err);
    }
  }

  // 3. Compare routes
  const missingRoutes = [];
  const matchingRoutes = [];
  
  const plannedApisList = Array.isArray(plannedApis) ? plannedApis : [];
  plannedApisList.forEach(planned => {
    const plannedNorm = normalizePath(planned.route);
    const plannedMethod = planned.method.toUpperCase();

    // Check if there is a matching route in code
    const isMatched = parsedRoutes.some(codeRoute => {
      return codeRoute.method === plannedMethod && 
             (codeRoute.normalized === plannedNorm || 
              codeRoute.normalized.includes(plannedNorm) || 
              plannedNorm.includes(codeRoute.normalized));
    });

    if (isMatched) {
      matchingRoutes.push(planned);
    } else {
      missingRoutes.push(planned);
    }
  });

  // Calculate extra routes (routes in code not in planned architecture)
  const extraRoutes = [];
  parsedRoutes.forEach(codeRoute => {
    const isPlanned = plannedApisList.some(planned => {
      const plannedNorm = normalizePath(planned.route);
      return planned.method.toUpperCase() === codeRoute.method && 
             (plannedNorm === codeRoute.normalized || 
              plannedNorm.includes(codeRoute.normalized));
    });
    if (!isPlanned && !extraRoutes.some(r => r.route === codeRoute.route && r.method === codeRoute.method)) {
      extraRoutes.push({
        method: codeRoute.method,
        route: codeRoute.route
      });
    }
  });

  // 4. Compare Database schemas
  const missingCollections = [];
  const matchingCollections = [];

  const plannedDbList = Array.isArray(plannedDbSchema) ? plannedDbSchema : [];
  plannedDbList.forEach(planned => {
    const plannedCol = planned.collection.toLowerCase();
    
    // Check if this collection (or model) exists in code-parsed list (forgiving match, e.g. 'users' matches 'user')
    const isMatched = Array.from(parsedCollections).some(codeCol => {
      return codeCol === plannedCol || 
             codeCol.replace(/s$/, '') === plannedCol.replace(/s$/, '');
    });

    if (isMatched) {
      matchingCollections.push(planned.collection);
    } else {
      missingCollections.push(planned.collection);
    }
  });

  const extraCollections = Array.from(parsedCollections).filter(codeCol => {
    return !plannedDbList.some(planned => {
      const plannedCol = planned.collection.toLowerCase();
      return codeCol === plannedCol || 
             codeCol.replace(/s$/, '') === plannedCol.replace(/s$/, '');
    });
  });

  // 5. Calculate Drift & Compliance Score
  const totalPlannedItems = plannedApisList.length + plannedDbList.length;
  const totalMatchedItems = matchingRoutes.length + matchingCollections.length;
  
  const complianceScore = totalPlannedItems > 0 
    ? Math.round((totalMatchedItems / totalPlannedItems) * 100) 
    : 100;
  
  const driftScore = 100 - complianceScore;

  return {
    complianceScore,
    driftScore,
    scannedFilesCount: filesToScan.length,
    scannedBranch: targetBranch,
    routes: {
      totalPlanned: plannedApisList.length,
      matchingCount: matchingRoutes.length,
      missing: missingRoutes,
      extra: extraRoutes
    },
    collections: {
      totalPlanned: plannedDbList.length,
      matchingCount: matchingCollections.length,
      missing: missingCollections,
      extra: extraCollections
    },
    analyzedAt: new Date().toISOString()
  };
}

module.exports = {
  normalizePath,
  extractRoutesFromCode,
  extractDbCollectionsFromCode,
  analyzeRepositoryDrift
};
