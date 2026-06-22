// Minimal mock of the Open Finance Brasil Resources API (Recursos) v3.0.0, used only to
// demonstrate that the Postman/Newman suite executes and passes. It is NOT the
// implementation under test — it returns contract-shaped responses and enforces the
// auth/header rules the tests assert. Real runs target the actual sandbox.
//
//   node mock/server.js        # listens on PORT (default 3399)
//
// Contract reference (official OpenAPI v3.0.0):
//   server base : {host}/open-banking/resources/v3
//   endpoint    : GET /resources   (list only; there is no detail-by-id endpoint)

const http = require('http');

const PORT = process.env.PORT || 3399;
const BASE_PATH = '/open-banking/resources/v3/resources';

// Resources visible to the default consent (consent A) vs. another consent (consent B).
const CONSENT_A = [
  { resourceId: 'rsrc-001', type: 'ACCOUNT', status: 'AVAILABLE' },
  { resourceId: 'rsrc-002', type: 'CREDIT_CARD_ACCOUNT', status: 'AVAILABLE' },
  { resourceId: 'rsrc-003', type: 'LOAN', status: 'TEMPORARILY_UNAVAILABLE' },
];
const CONSENT_B = [
  { resourceId: 'rsrc-B01', type: 'FINANCING', status: 'AVAILABLE' },
  { resourceId: 'rsrc-B02', type: 'VARIABLE_INCOME', status: 'PENDING_AUTHORISATION' },
];

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
    return error(res, 401, undefined, 'UNAUTHORIZED', 'Missing or invalid access token');
  }
  // Required FAPI interaction id.
  if (!interactionId) {
    return error(res, 400, undefined, 'BAD_REQUEST', 'Missing x-fapi-interaction-id header');
  }
  // Content negotiation.
  if (accept && !accept.includes('application/json') && !accept.includes('*/*')) {
    return error(res, 406, interactionId, 'NOT_ACCEPTABLE', 'Unsupported Accept header');
  }

  if (url.pathname !== BASE_PATH) {
    return error(res, 404, interactionId, 'NOT_FOUND', 'Unknown route');
  }
  if (req.method !== 'GET') {
    return error(res, 405, interactionId, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // The returned resources are scoped to the consent bound to the token.
  const token = auth.slice('Bearer '.length);
  const all = token === 'consent-b-token' ? CONSENT_B : CONSENT_A;

  const pageSize = Math.max(1, parseInt(url.searchParams.get('page-size') || '25', 10));
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const totalRecords = all.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const data = all.slice((page - 1) * pageSize, page * pageSize);

  const base = `${url.origin}${url.pathname}`;
  const links = { self: url.href, first: `${base}?page=1&page-size=${pageSize}`, last: `${base}?page=${totalPages}&page-size=${pageSize}` };
  if (page < totalPages) links.next = `${base}?page=${page + 1}&page-size=${pageSize}`;
  if (page > 1) links.prev = `${base}?page=${page - 1}&page-size=${pageSize}`;

  return send(res, 200, interactionId, {
    data,
    links,
    meta: { totalRecords, totalPages, requestDateTime: new Date().toISOString() },
  });
});

server.listen(PORT, () => console.log(`mock Resources API listening on http://localhost:${PORT}${BASE_PATH}`));
