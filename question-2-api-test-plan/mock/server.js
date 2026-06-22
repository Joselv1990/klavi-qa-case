// Minimal mock of the Resources API, used only to demonstrate that the Postman/Newman
// suite executes and passes. It is NOT the implementation under test — it is a stand-in
// that returns contract-shaped responses and enforces the auth/header rules the tests
// assert. Run real runs against the actual sandbox (see ../README.md).
//
//   node mock/server.js        # listens on PORT (default 3399)

const http = require('http');

const PORT = process.env.PORT || 3399;

const RESOURCES = [
  { resourceId: 'rsrc-001', type: 'ACCOUNT', status: 'AVAILABLE' },
  { resourceId: 'rsrc-002', type: 'CREDIT_CARD_ACCOUNT', status: 'AVAILABLE' },
  { resourceId: 'rsrc-003', type: 'LOAN', status: 'TEMPORARILY_UNAVAILABLE' },
];
const OTHER_CONSENT_ID = 'other-consent-resource';

const send = (res, status, interactionId, body) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (interactionId) headers['x-fapi-interaction-id'] = interactionId;
  res.writeHead(status, headers);
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const error = (res, status, interactionId, code, title) =>
  send(res, status, interactionId, { errors: [{ code, title, detail: title }] });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const interactionId = req.headers['x-fapi-interaction-id'];
  const accept = req.headers['accept'];
  const auth = req.headers['authorization'];

  // AuthN gate first.
  if (!auth || !auth.startsWith('Bearer ')) {
    return error(res, 401, interactionId, 'UNAUTHORIZED', 'Missing or invalid access token');
  }
  // Content negotiation.
  if (accept && !accept.includes('application/json') && !accept.includes('*/*')) {
    return error(res, 406, interactionId, 'NOT_ACCEPTABLE', 'Unsupported Accept header');
  }

  const parts = url.pathname.split('/').filter(Boolean); // resources, v3, resources[, :id]
  const isResources = parts[0] === 'resources' && parts[1] === 'v3' && parts[2] === 'resources';

  if (isResources && parts.length === 3 && req.method === 'GET') {
    const pageSize = Math.max(1, parseInt(url.searchParams.get('page-size') || '25', 10));
    const totalRecords = RESOURCES.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const data = RESOURCES.slice(0, pageSize);
    const links = { self: url.href };
    if (totalPages > 1) links.next = `${url.origin}${url.pathname}?page-size=${pageSize}&page=2`;
    return send(res, 200, interactionId, {
      data,
      links,
      meta: { totalRecords, totalPages, requestDateTime: new Date().toISOString() },
    });
  }

  if (isResources && parts.length === 4 && req.method === 'GET') {
    const id = decodeURIComponent(parts[3]);
    if (id === OTHER_CONSENT_ID) {
      return error(res, 403, interactionId, 'FORBIDDEN', 'Resource not accessible for this consent');
    }
    const found = RESOURCES.find((r) => r.resourceId === id);
    if (!found) return error(res, 404, interactionId, 'NOT_FOUND', 'Resource not found');
    return send(res, 200, interactionId, { data: found, links: { self: url.href }, meta: {} });
  }

  if (isResources) return error(res, 405, interactionId, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  return error(res, 404, interactionId, 'NOT_FOUND', 'Unknown route');
});

server.listen(PORT, () => console.log(`mock Resources API listening on http://localhost:${PORT}`));
